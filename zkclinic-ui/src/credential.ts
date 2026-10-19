/**
 * Milestone 2: Health credential schema and crypto utilities.
 * Credential is signed by doctor, encrypted for patient, stored on device only.
 */

export const CREDENTIAL_VALIDITY_MONTHS = 12;

export interface CredentialLabResult {
  testName: string;
  value: number;
  unit: string;
}

/** Mirrors verification API PatientIntakeV1 — stored encrypted on the health card. */
export type PatientIntakeV1 = {
  narrative?: string;
  chiefComplaint?: string;
  conditions?: Array<{
    label?: string;
    icd10?: string;
    icd11?: string;
    status?: string;
    approxWhen?: string;
    approxOnset?: string;
    approxResolution?: string;
    notes?: string;
  }>;
  medicationsList?: string[];
  medicationAllergies?: string[];
  allergies?: string[];
  environmentalAllergens?: string[];
  pastMedicalHistory?: string;
  surgicalHistory?: string;
  hospitalizations?: string;
  familyHistory?: string;
  immunizations?: string;
  socialHistory?: string;
  occupationalExposure?: string;
  currentSymptoms?: string[];
};

export interface HealthCredentialPayload {
  credentialId: string;
  patientId?: string;
  doctorPubKeyHex: string;
  icd10Codes: string[];
  /** ICD-11 MMS stem codes when used instead of or alongside ICD-10. */
  icd11Codes?: string[];
  ageYears?: number;
  medications: string[];
  labResults: CredentialLabResult[];
  /** Patient-provided intake merged into the encrypted credential. */
  patientIntake?: PatientIntakeV1;
  issuedAt: number;
  expiresAt: number;
  signature?: string; // Placeholder for Schnorr - full verification in later milestone
}

export function createCredentialId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeCredentialIdHex(id: string): string {
  return id.replace(/^0x/i, "").toLowerCase();
}

function normMedToken(s: string): string {
  return s.trim().toLowerCase();
}

function mergeMedicationsAndIntake(
  intake: PatientIntakeV1 | undefined,
  doctorMeds: string[] | undefined
): string[] {
  const fromIntakeMeds = (intake?.medicationsList ?? []).map((m) => m.trim()).filter(Boolean);
  const docMeds = (doctorMeds ?? []).map((m) => m.trim()).filter(Boolean);
  const medByKey = new Map<string, string>();
  for (const m of [...docMeds, ...fromIntakeMeds]) {
    const t = normMedToken(m);
    if (t) medByKey.set(t, m);
  }
  return [...medByKey.values()];
}

function mergeIcdSets(
  icd10Codes: string[],
  intake: PatientIntakeV1 | undefined,
  icd11FromDoctor: string[] | undefined
): { mergedIcd10: string[]; mergedIcd11: string[] | undefined } {
  const ten = new Set(icd10Codes.map((c) => c.trim().toUpperCase()).filter(Boolean));
  for (const c of intake?.conditions ?? []) {
    const code = c.icd10?.trim().toUpperCase();
    if (code) ten.add(code);
  }
  const mergedIcd10 = [...ten];

  const eleven = new Set((icd11FromDoctor ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean));
  for (const c of intake?.conditions ?? []) {
    const code = c.icd11?.trim().toUpperCase().replace(/\s+/g, "");
    if (code) eleven.add(code);
  }
  const mergedIcd11 = eleven.size ? [...eleven] : undefined;
  return { mergedIcd10, mergedIcd11 };
}

function buildHealthCredentialPayload(
  credentialId: string,
  doctorPubKeyHex: string,
  icd10Codes: string[],
  issuedAt: number,
  expiresAtMs: number,
  patientId?: string,
  details?: {
    ageYears?: number;
    medications?: string[];
    labResults?: CredentialLabResult[];
    icd11Codes?: string[];
    patientIntake?: PatientIntakeV1;
  }
): HealthCredentialPayload {
  const intake = details?.patientIntake;
  const medications = mergeMedicationsAndIntake(intake, details?.medications);
  const { mergedIcd10, mergedIcd11 } = mergeIcdSets(icd10Codes, intake, details?.icd11Codes);

  return {
    credentialId: normalizeCredentialIdHex(credentialId),
    patientId,
    doctorPubKeyHex,
    icd10Codes: mergedIcd10,
    icd11Codes: mergedIcd11,
    ageYears: details?.ageYears,
    medications,
    labResults: details?.labResults ?? [],
    patientIntake: intake,
    issuedAt,
    expiresAt: expiresAtMs,
    signature: undefined
  };
}

export function createCredentialPayload(
  doctorPubKeyHex: string,
  icd10Codes: string[],
  patientId?: string,
  details?: {
    ageYears?: number;
    medications?: string[];
    labResults?: CredentialLabResult[];
    icd11Codes?: string[];
    patientIntake?: PatientIntakeV1;
  }
): HealthCredentialPayload {
  const credentialId = createCredentialId();
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + CREDENTIAL_VALIDITY_MONTHS);
  return buildHealthCredentialPayload(
    credentialId,
    doctorPubKeyHex,
    icd10Codes,
    issuedAt,
    expiresAt.getTime(),
    patientId,
    details
  );
}

/** Same logical card id across visits; refreshes issuedAt / expiresAt and merges clinical fields. */
export function createCredentialPayloadContinuingCard(
  existingCredentialIdHex: string,
  doctorPubKeyHex: string,
  icd10Codes: string[],
  patientId?: string,
  details?: {
    ageYears?: number;
    medications?: string[];
    labResults?: CredentialLabResult[];
    icd11Codes?: string[];
    patientIntake?: PatientIntakeV1;
  }
): HealthCredentialPayload {
  const issuedAt = Date.now();
  const expiresAt = new Date(issuedAt);
  expiresAt.setMonth(expiresAt.getMonth() + CREDENTIAL_VALIDITY_MONTHS);
  return buildHealthCredentialPayload(
    normalizeCredentialIdHex(existingCredentialIdHex),
    doctorPubKeyHex,
    icd10Codes,
    issuedAt,
    expiresAt.getTime(),
    patientId,
    details
  );
}

export function isCredentialExpired(payload: HealthCredentialPayload): boolean {
  return Date.now() > payload.expiresAt;
}

/** Commitment posted on-chain for each signed diagnosis visit (32-byte SHA-256 hex). */
export async function diagnosisVisitCommitment(input: {
  credentialId: string;
  icd10Codes: string[];
  icd11Codes?: string[];
  issuedAtMs: number;
  visitNonceHex: string;
}): Promise<string> {
  const cred = normalizeCredentialIdHex(input.credentialId);
  const payload = JSON.stringify({
    v: 1,
    credentialId: cred,
    icd10: [...input.icd10Codes].map((c) => c.trim().toUpperCase()).filter(Boolean).sort(),
    icd11: [...(input.icd11Codes ?? [])].map((c) => c.trim().toUpperCase().replace(/\s+/g, "")).filter(Boolean).sort(),
    issuedAtMs: input.issuedAtMs,
    visitNonce: input.visitNonceHex.replace(/^0x/i, "").toLowerCase()
  });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomVisitNonceHex(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveKeyFromRequestCode(requestCode: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`zkclinic-credential:${requestCode.toUpperCase()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function deriveKeyFromCardId(credentialIdHex: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const id = normalizeCredentialIdHex(credentialIdHex);
  const data = encoder.encode(`zkclinic-credential-card:${id}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptAesGcmJson(payload: HealthCredentialPayload, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptAesGcmJson(encryptedBase64: string, key: CryptoKey): Promise<HealthCredentialPayload> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(decrypted)) as HealthCredentialPayload;
}

/**
 * Encrypt credential JSON. First-visit default: key from request code. Continuing same card: key from credentialId.
 */
export async function encryptCredential(
  payload: HealthCredentialPayload,
  requestCode: string,
  opts?: { useCardKey?: boolean }
): Promise<string> {
  const key = opts?.useCardKey
    ? await deriveKeyFromCardId(payload.credentialId)
    : await deriveKeyFromRequestCode(requestCode);
  return encryptAesGcmJson(payload, key);
}

/**
 * Decrypt credential JSON. Tries request-code key first (legacy / first delivery), then card-id key (continuing visits).
 */
export async function decryptCredential(
  encryptedBase64: string,
  requestCode: string,
  credentialIdHex?: string
): Promise<HealthCredentialPayload> {
  let last: Error | null = null;
  try {
    const key = await deriveKeyFromRequestCode(requestCode);
    return await decryptAesGcmJson(encryptedBase64, key);
  } catch (e) {
    last = e instanceof Error ? e : new Error(String(e));
  }
  if (credentialIdHex?.trim()) {
    try {
      const key = await deriveKeyFromCardId(credentialIdHex);
      return await decryptAesGcmJson(encryptedBase64, key);
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("Decrypt failed");
}
