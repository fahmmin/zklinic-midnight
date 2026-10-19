/**
 * AES-GCM credential encryption aligned with zkclinic-ui/src/credential.ts (Node webcrypto).
 */
import { createHash, randomBytes } from "node:crypto";
import { webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;

export const CREDENTIAL_VALIDITY_MONTHS = 12;

export interface HealthCredentialPayload {
  credentialId: string;
  patientId?: string;
  doctorPubKeyHex: string;
  icd10Codes: string[];
  issuedAt: number;
  expiresAt: number;
  signature?: string;
}

function randomBytes32Hex(): string {
  const b = new Uint8Array(32);
  webcrypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function normalizeCredentialIdHex(id: string): string {
  return id.replace(/^0x/i, "").toLowerCase();
}

export function createCredentialPayload(
  doctorPubKeyHex: string,
  icd10Codes: string[],
  patientId?: string
): HealthCredentialPayload {
  const credentialId = randomBytes32Hex();
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + CREDENTIAL_VALIDITY_MONTHS);
  return {
    credentialId,
    patientId,
    doctorPubKeyHex,
    icd10Codes: [...new Set(icd10Codes.map((c) => c.trim().toUpperCase()).filter(Boolean))],
    issuedAt,
    expiresAt: expiresAt.getTime(),
    signature: undefined
  };
}

/** Reuse an existing on-chain credential id (continuing-care visit). */
export function createCredentialPayloadContinuingCard(
  existingCredentialIdHex: string,
  doctorPubKeyHex: string,
  icd10Codes: string[],
  patientId?: string
): HealthCredentialPayload {
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + CREDENTIAL_VALIDITY_MONTHS);
  return {
    credentialId: normalizeCredentialIdHex(existingCredentialIdHex),
    patientId,
    doctorPubKeyHex,
    icd10Codes: [...new Set(icd10Codes.map((c) => c.trim().toUpperCase()).filter(Boolean))],
    issuedAt,
    expiresAt: expiresAt.getTime(),
    signature: undefined
  };
}

async function deriveKeyFromRequestCode(requestCode: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`zkclinic-credential:${requestCode.toUpperCase()}`);
  const hash = await subtle.digest("SHA-256", data);
  return subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function deriveKeyFromCardId(credentialIdHex: string) {
  const encoder = new TextEncoder();
  const id = normalizeCredentialIdHex(credentialIdHex);
  const data = encoder.encode(`zkclinic-credential-card:${id}`);
  const hash = await subtle.digest("SHA-256", data);
  return subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptCredential(
  payload: HealthCredentialPayload,
  requestCode: string,
  opts?: { useCardKey?: boolean }
): Promise<string> {
  const key = opts?.useCardKey
    ? await deriveKeyFromCardId(payload.credentialId)
    : await deriveKeyFromRequestCode(requestCode);
  const iv = new Uint8Array(12);
  webcrypto.getRandomValues(iv);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return Buffer.from(combined).toString("base64");
}

/** 64-hex SHA-256 commitment for appendDiagnosisToCredential (matches UI `diagnosisVisitCommitment` JSON v1). */
export function diagnosisVisitCommitmentSync(input: {
  credentialId: string;
  icd10Codes: string[];
  icd11Codes?: string[];
  issuedAtMs: number;
  visitNonceHex: string;
}): string {
  const cred = normalizeCredentialIdHex(input.credentialId);
  const payload = JSON.stringify({
    v: 1,
    credentialId: cred,
    icd10: [...input.icd10Codes].map((c) => c.trim().toUpperCase()).filter(Boolean).sort(),
    icd11: [...(input.icd11Codes ?? [])]
      .map((c) => c.trim().toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean)
      .sort(),
    issuedAtMs: input.issuedAtMs,
    visitNonce: input.visitNonceHex.replace(/^0x/i, "").toLowerCase()
  });
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function randomVisitNonceHex(): string {
  return randomBytes(16).toString("hex");
}
