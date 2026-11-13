import { createHash, randomBytes } from "node:crypto";

/**
 * Didit identity check for doctors (https://docs.didit.me, v3 sessions API).
 * ZKLinic keeps only the outcome and a hash binding it to the doctor's key; ID data stays with Didit.
 *
 * Env: DIDIT_API_KEY + DIDIT_WORKFLOW_ID for the real service (add DIDIT_SANDBOX_SCENARIO=approve with a
 * sandbox-mode Didit app: free, simulated sessions), or DIDIT_MOCK=1 for offline demos (always approves).
 */
const DIDIT_BASE = "https://verification.didit.me/v3";

export type DiditStatus =
  | "Not Started"
  | "In Progress"
  | "In Review"
  | "Approved"
  | "Declined"
  | "Resubmitted"
  | "Abandoned"
  | "Expired"
  | "Kyc Expired"
  | string;

export type DiditResult = {
  sessionId: string;
  status: DiditStatus;
  approved: boolean;
  /** sha256 over (session, doctor key): proof-of-check that reveals nothing about the person. Only when approved. */
  attestationHash?: string;
};

type Fetch = typeof fetch;

export function diditMode(env = process.env): "live" | "mock" | "off" {
  if (env.DIDIT_MOCK === "1") return "mock";
  return env.DIDIT_API_KEY && env.DIDIT_WORKFLOW_ID ? "live" : "off";
}

export function diditAttestationHash(sessionId: string, doctorPubKeyHex: string): string {
  return createHash("sha256").update(`zkclinic-didit-v1|${sessionId}|${doctorPubKeyHex}`, "utf8").digest("hex");
}

export function createDidit(env = process.env, fetchFn: Fetch = fetch) {
  const mode = diditMode(env);
  // shortcut: mock sessions live in memory only, fine for demos; live sessions are always re-read from Didit.
  const mockSessions = new Map<string, string>();

  async function createSession(doctorPubKeyHex: string, callback: string): Promise<{ sessionId: string; url: string }> {
    if (mode === "off") throw new Error("Didit is not configured on this server");
    if (mode === "mock") {
      const sessionId = `mock-${randomBytes(8).toString("hex")}`;
      mockSessions.set(sessionId, doctorPubKeyHex);
      const u = new URL(callback);
      u.searchParams.set("verificationSessionId", sessionId);
      u.searchParams.set("status", "Approved");
      return { sessionId, url: u.toString() };
    }
    const res = await fetchFn(`${DIDIT_BASE}/session/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.DIDIT_API_KEY! },
      body: JSON.stringify({
        workflow_id: env.DIDIT_WORKFLOW_ID,
        callback,
        vendor_data: doctorPubKeyHex,
        // Sandbox apps only (free, simulated): e.g. "approve" or "decline_document_expired".
        ...(env.DIDIT_SANDBOX_SCENARIO ? { sandbox_scenario: env.DIDIT_SANDBOX_SCENARIO } : {})
      })
    });
    const j = (await res.json().catch(() => ({}))) as { session_id?: string; url?: string; detail?: string };
    if (!res.ok || !j.session_id || !j.url) throw new Error(`Didit session failed (${res.status}) ${j.detail ?? ""}`.trim());
    return { sessionId: j.session_id, url: j.url };
  }

  /** Reads Didit's decision and checks it belongs to this doctor key. */
  async function getResult(sessionId: string, doctorPubKeyHex: string): Promise<DiditResult> {
    if (mode === "off") throw new Error("Didit is not configured on this server");
    let status: DiditStatus;
    let owner: string | undefined;
    if (mode === "mock") {
      owner = mockSessions.get(sessionId);
      status = owner ? "Approved" : "Not Started";
    } else {
      const res = await fetchFn(`${DIDIT_BASE}/session/${encodeURIComponent(sessionId)}/decision/`, {
        headers: { "x-api-key": env.DIDIT_API_KEY! }
      });
      if (res.status === 404) throw new Error("Unknown Didit session");
      if (!res.ok) throw new Error(`Didit decision failed (${res.status})`);
      const j = (await res.json()) as { status?: string; vendor_data?: string };
      status = j.status ?? "Not Started";
      owner = j.vendor_data;
    }
    if (owner !== undefined && owner !== doctorPubKeyHex) throw new Error("This Didit session belongs to another doctor");
    const approved = status === "Approved";
    return {
      sessionId,
      status,
      approved,
      attestationHash: approved ? diditAttestationHash(sessionId, doctorPubKeyHex) : undefined
    };
  }

  return { mode, createSession, getResult };
}
