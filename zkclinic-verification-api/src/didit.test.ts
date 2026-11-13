import { describe, expect, it } from "vitest";
import { createDidit, diditAttestationHash } from "./didit.js";

const DOC = "ab".repeat(32);

describe("didit", () => {
  it("is off without keys", async () => {
    const d = createDidit({});
    expect(d.mode).toBe("off");
    await expect(d.createSession(DOC, "http://x/app/doctor")).rejects.toThrow(/not configured/);
  });

  it("mock mode approves and binds the hash to the doctor key", async () => {
    const d = createDidit({ DIDIT_MOCK: "1" });
    const { sessionId, url } = await d.createSession(DOC, "http://localhost:5199/app/doctor");
    expect(url).toContain(`verificationSessionId=${sessionId}`);
    const r = await d.getResult(sessionId, DOC);
    expect(r.approved).toBe(true);
    expect(r.attestationHash).toBe(diditAttestationHash(sessionId, DOC));
    await expect(d.getResult(sessionId, "cd".repeat(32))).rejects.toThrow(/another doctor/);
  });

  it("live mode sends the key and reads the decision", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      const body = url.endsWith("/session/")
        ? { session_id: "s1", url: "https://verify.didit.me/session/tok" }
        : { status: "Declined", vendor_data: DOC };
      return new Response(JSON.stringify(body), { status: url.endsWith("/session/") ? 201 : 200 });
    }) as typeof fetch;
    const d = createDidit({ DIDIT_API_KEY: "k", DIDIT_WORKFLOW_ID: "w" }, fake);
    expect(await d.createSession(DOC, "http://x")).toEqual({ sessionId: "s1", url: "https://verify.didit.me/session/tok" });
    expect((calls[0]![1]!.headers as Record<string, string>)["x-api-key"]).toBe("k");
    expect(JSON.parse(calls[0]![1]!.body as string)).toMatchObject({ workflow_id: "w", vendor_data: DOC });
    const r = await d.getResult("s1", DOC);
    expect(r).toMatchObject({ status: "Declined", approved: false, attestationHash: undefined });
    expect(calls[1]![0]).toBe("https://verification.didit.me/v3/session/s1/decision/");
  });
});
