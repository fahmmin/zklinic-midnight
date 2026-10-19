/**
 * India NMC IMR doctor lookup + risk scoring (off-chain attestation input).
 * Endpoint pattern from NMC MCIRest (HTTPS).
 */

import { createHash } from "node:crypto";

const NMC_URL =
  "https://www.nmc.org.in/MCIRest/open/getDataFromService?service=getDoctorDetailsByIdImrExt";

export type NmcDoctorPayload = {
  doctorId?: number | string;
  regdNoValue?: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  smcName?: string | null;
  yearOfPassing?: string | null;
  registrationNo?: string | null;
  [key: string]: unknown;
};

export type RiskBand = "high" | "medium" | "low";

export type NmcVerificationResult = {
  riskBand: RiskBand;
  confidence: number;
  reasons: string[];
  nmcRecordHash: string;
  verificationPayloadHash: string;
  raw: NmcDoctorPayload;
};

function normalizeName(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function fullNameFromPayload(p: NmcDoctorPayload): string {
  const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean).map((x) => String(x));
  return normalizeName(parts.join(" "));
}

export function hashNmcPayload(payload: NmcDoctorPayload): string {
  const stable = JSON.stringify(
    Object.keys(payload)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = payload[k];
        return acc;
      }, {})
  );
  return createHash("sha256").update(stable, "utf8").digest("hex");
}

export function computeVerificationPayloadHash(parts: {
  doctorId: string;
  regdNoValue: string;
  nmcRecordHash: string;
  licenseHash: string;
}): string {
  const s = stableStringify(parts);
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((x) => stableStringify(x)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export async function fetchNmcDoctorDetails(
  doctorId: string,
  regdNoValue: string
): Promise<NmcDoctorPayload> {
  const res = await fetch(NMC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ doctorId, regdNoValue })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`NMC request failed: ${res.status} ${t.slice(0, 200)}`);
  }
  return (await res.json()) as NmcDoctorPayload;
}

/**
 * Score 0..1 from OCR hints vs NMC record.
 */
export function scoreNmcMatch(input: {
  doctorId: string;
  regdNoValue: string;
  ocrNameHint?: string;
  ocrSmcHint?: string;
  nmc: NmcDoctorPayload;
}): { confidence: number; reasons: string[]; riskBand: RiskBand } {
  const reasons: string[] = [];
  let score = 0;
  const max = 5;

  const idMatch = String(input.nmc.doctorId ?? "") === String(input.doctorId);
  const regMatch =
    String(input.nmc.registrationNo ?? input.nmc.regdNoValue ?? "").trim() ===
    String(input.regdNoValue).trim();
  if (idMatch) {
    score += 2;
    reasons.push("doctorId matches NMC record");
  } else {
    reasons.push("doctorId mismatch with NMC");
  }
  if (regMatch) {
    score += 2;
    reasons.push("registration number matches NMC");
  } else {
    reasons.push("registration number mismatch");
  }

  if (input.ocrNameHint?.trim()) {
    const hint = normalizeName(input.ocrNameHint);
    const full = fullNameFromPayload(input.nmc);
    if (hint && full && (full.includes(hint) || hint.includes(full))) {
      score += 0.75;
      reasons.push("OCR name consistent with NMC name");
    } else if (hint && full) {
      const overlap = hint.split(" ").filter((w) => w.length > 2 && full.includes(w));
      if (overlap.length >= 2) {
        score += 0.5;
        reasons.push("Partial name match");
      } else {
        reasons.push("Name could not be verified against OCR");
      }
    }
  }

  if (input.ocrSmcHint?.trim() && input.nmc.smcName) {
    const a = normalizeName(input.ocrSmcHint);
    const b = normalizeName(String(input.nmc.smcName));
    if (a && b && (a.includes(b) || b.includes(a))) {
      score += 0.25;
      reasons.push("State medical council hint matches");
    }
  }

  const confidence = Math.min(1, score / max);

  let riskBand: RiskBand = "low";
  if (confidence >= 0.75) riskBand = "high";
  else if (confidence >= 0.45) riskBand = "medium";

  return { confidence, reasons, riskBand };
}

export async function verifyDoctorNmc(input: {
  doctorId: string;
  regdNoValue: string;
  licenseHash: string;
  ocrNameHint?: string;
  ocrSmcHint?: string;
}): Promise<NmcVerificationResult> {
  // Temporary local-dev bypass: default to fake verification unless explicitly disabled.
  // Set ZKCLINIC_FAKE_NMC_VERIFY=0 to force real NMC fetch.
  const useFakeVerification = process.env.ZKCLINIC_FAKE_NMC_VERIFY !== "0";
  if (useFakeVerification) {
    const raw: NmcDoctorPayload = {
      doctorId: input.doctorId,
      regdNoValue: input.regdNoValue,
      registrationNo: input.regdNoValue,
      firstName: "Demo",
      lastName: "Doctor",
      smcName: input.ocrSmcHint ?? "Demo State Medical Council"
    };
    const nmcRecordHash = hashNmcPayload(raw);
    const verificationPayloadHash = computeVerificationPayloadHash({
      doctorId: input.doctorId,
      regdNoValue: input.regdNoValue,
      nmcRecordHash,
      licenseHash: input.licenseHash.replace(/^0x/, "").toLowerCase()
    });
    return {
      riskBand: "high",
      confidence: 1,
      reasons: ["FAKE_NMC_VERIFICATION_ENABLED"],
      nmcRecordHash,
      verificationPayloadHash,
      raw
    };
  }

  const raw = await fetchNmcDoctorDetails(input.doctorId, input.regdNoValue);
  const nmcRecordHash = hashNmcPayload(raw);
  const { confidence, reasons, riskBand } = scoreNmcMatch({
    doctorId: input.doctorId,
    regdNoValue: input.regdNoValue,
    ocrNameHint: input.ocrNameHint,
    ocrSmcHint: input.ocrSmcHint,
    nmc: raw
  });
  const verificationPayloadHash = computeVerificationPayloadHash({
    doctorId: input.doctorId,
    regdNoValue: input.regdNoValue,
    nmcRecordHash,
    licenseHash: input.licenseHash.replace(/^0x/, "").toLowerCase()
  });
  return {
    riskBand,
    confidence,
    reasons,
    nmcRecordHash,
    verificationPayloadHash,
    raw
  };
}
