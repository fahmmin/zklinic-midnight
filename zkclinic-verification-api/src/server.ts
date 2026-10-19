import restify from "restify";
import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";
import {
  createDebouncedPersist,
  defaultPersistencePath,
  loadPersistedJson,
  savePersistedJson,
  type PersistedEnvelopeV1
} from "./diskPersistence.js";
import { codeToIcd11Text, textToIcd11Pipeline, whoLookupMmsCode } from "./icd11.js";
import { verifyDoctorNmc } from "./nmcDoctorVerification.js";
import { geminiGenerateJson } from "./geminiAssistant.js";
import type { IssuerRegistration, IssuerRegistrationStatus } from "./issuerRegistrationTypes.js";

const ICD10_API = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";
export const DEFAULT_PROOF_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

export type TrialCriteriaV1 = {
  version: 1;
  trialId: string;
  title: string;
  shortDescription?: string;
  inclusionIcd10: string[];
  exclusionIcd10: string[];
  /** Optional ICD-11 MMS codes (validated via WHO when configured). */
  inclusionIcd11?: string[];
  exclusionIcd11?: string[];
  exclusionMedications: string[];
  /** Minimum match % on non-exclusion criteria (default 75). */
  eligibilityThresholdPercent?: number;
  ageMin?: number;
  ageMax?: number;
  labCriteria: Array<{
    testName: string;
    operator: string;
    threshold: number;
    unit: string;
  }>;
};

export type DoctorReviewEntry = {
  reviewId: string;
  doctorPubKeyHex: string;
  licenseHash: string;
  verificationPayloadHash: string;
  riskBand: string;
  confidence: number;
  reasons: string[];
  createdAt: number;
  /** Links medium-risk queue to combined issuer registration. */
  issuerRegistrationId?: string;
};

/** Optional patient-provided context on credential request (encrypted card is separate). */
export type PatientIntakeV1 = {
  narrative?: string;
  chiefComplaint?: string;
  conditions?: Array<{
    label?: string;
    icd10?: string;
    icd11?: string;
    status?: string;
    /** Legacy alias; prefer approxOnset */
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

export type StoredTrial = {
  trialIdHex: string;
  criteria: TrialCriteriaV1;
  criteriaHashHex: string;
  postedAt: number;
  managerPubKeyHex?: string;
};

export type ProofCriterionResult = {
  label: string;
  detail: string;
  passed: boolean;
};

export type ProofMessage = {
  messageId: string;
  proofId: string;
  sentAt: number;
  body: string;
};

export type StoredProof = {
  proofId: string;
  trialIdHex: string;
  trialTitle: string;
  criteriaHashHex: string;
  managerPubKeyHex?: string;
  pseudonym: string;
  eligible: boolean;
  /** 0–100 match score on non-exclusion criteria (for manager dashboards). */
  matchPercent?: number;
  /** Trial threshold % used for eligibility (default 75). */
  thresholdPercent?: number;
  criterionResults: ProofCriterionResult[];
  createdAt: number;
  expiresAt: number;
  revealedIdentity?: string;
  messages: ProofMessage[];
};

type CredentialRequest = {
  requestId: string;
  requestCode: string;
  patientId?: string;
  /** When set, patient is asking to extend this existing on-chain card (same credentialId, new visit). */
  continuingCredentialId?: string;
  patientIntake?: PatientIntakeV1;
  createdAt: number;
  credential?: { encryptedCredential: string; credentialId: string; deliveredAt: number };
};

export type ZkClinicApiDependencies = {
  now?: () => number;
  randomBytes?: (size: number) => Uint8Array | Buffer;
  resolveIcd10Exact?: (code: string) => Promise<{ code: string; name: string } | null>;
};

export function stableStringify(value: unknown): string {
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

export async function sha256HexUtf8(text: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(text, "utf8");
  return hash.digest("hex");
}

/** Same shape as after JSON request body parse (no `undefined` keys). Keeps client hash aligned with server. */
function trialCriteriaWireForm(criteria: TrialCriteriaV1): TrialCriteriaV1 {
  return JSON.parse(JSON.stringify(criteria)) as TrialCriteriaV1;
}

export async function defaultResolveIcd10Exact(code: string): Promise<{ code: string; name: string } | null> {
  const q = code.trim().toUpperCase();
  if (!q) return null;
  const url = `${ICD10_API}?terms=${encodeURIComponent(q)}&sf=code,name&maxList=30`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  const rows = Array.isArray(data) ? (data as unknown[])[1] : [];
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    const values = Array.isArray(row) ? row : [row];
    const resolvedCode = String(values[0] ?? "").toUpperCase();
    if (resolvedCode === q) {
      return { code: resolvedCode, name: String(values[1] ?? values[0] ?? "") };
    }
  }
  return null;
}

export function createZkClinicServer(deps: ZkClinicApiDependencies = {}) {
  const now = deps.now ?? (() => Date.now());
  const randomBytes = deps.randomBytes ?? nodeRandomBytes;
  const resolveIcd10Exact = deps.resolveIcd10Exact ?? defaultResolveIcd10Exact;

  const server = restify.createServer({ name: "zkclinic-verification-api" });

  /**
   * Browser UI (Vite on another origin/port) calls this API. Restify does not send CORS headers by default,
   * which surfaces as "Failed to fetch" in the app (no response body).
   *
   * Set `ZKCLINIC_CORS_ORIGINS` to a comma-separated allowlist (e.g. `http://localhost:5173,http://127.0.0.1:5173`).
   * If unset, the request `Origin` is echoed when present (dev-friendly); otherwise `*`.
   */
  const corsAllowlist = process.env.ZKCLINIC_CORS_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  server.pre((req, res, next) => {
    const origin = req.header("origin") ?? undefined;

    if (corsAllowlist?.length) {
      if (origin && corsAllowlist.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
      }
    } else if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    } else {
      res.header("Access-Control-Allow-Origin", "*");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      req.header("access-control-request-headers") ??
        "Content-Type, Authorization, X-Requested-With"
    );
    res.header("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      res.send(204);
      return next(false);
    }
    return next();
  });

  server.use(restify.plugins.bodyParser());

  const credentialRequests = new Map<string, CredentialRequest>();
  const trialsStore = new Map<string, StoredTrial>();
  const proofsStore = new Map<string, StoredProof>();
  const doctorReviewQueue = new Map<string, DoctorReviewEntry>();
  const issuerRegistrations = new Map<string, IssuerRegistration>();

  const persistencePath = defaultPersistencePath();
  const persistenceDisabled = process.env.ZKCLINIC_DISABLE_PERSISTENCE === "1";
  const looseTrialValidation = ["1", "true", "yes"].includes(
    (process.env.ZKCLINIC_LOOSE_TRIAL_VALIDATION ?? "").trim().toLowerCase()
  );
  if (looseTrialValidation) {
    // eslint-disable-next-line no-console
    console.warn(
      "[zkclinic-verification-api] ZKCLINIC_LOOSE_TRIAL_VALIDATION is on — trial ICD-10/ICD-11 checks are skipped (mock resolved labels only). Not for production."
    );
  }
  const schedulePersist = createDebouncedPersist(450);

  function persistStores(): void {
    if (persistenceDisabled) return;
    schedulePersist(() => {
      try {
        const envelope: PersistedEnvelopeV1 = {
          v: 1,
          credentialRequests: [...credentialRequests.entries()],
          trialsStore: [...trialsStore.entries()],
          proofsStore: [...proofsStore.entries()],
          doctorReviewQueue: [...doctorReviewQueue.entries()],
          issuerRegistrations: [...issuerRegistrations.entries()]
        };
        savePersistedJson(persistencePath, envelope);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[zkclinic-verification-api] persist failed:", e);
      }
    });
  }

  if (!persistenceDisabled) {
    const loaded = loadPersistedJson(persistencePath);
    if (loaded) {
      try {
        for (const [k, v] of loaded.credentialRequests) {
          credentialRequests.set(k, v as CredentialRequest);
        }
        for (const [k, v] of loaded.trialsStore) {
          trialsStore.set(k, v as StoredTrial);
        }
        for (const [k, v] of loaded.proofsStore) {
          proofsStore.set(k, v as StoredProof);
        }
        if (loaded.doctorReviewQueue) {
          for (const [k, v] of loaded.doctorReviewQueue) {
            doctorReviewQueue.set(k, v as DoctorReviewEntry);
          }
        }
        if (loaded.issuerRegistrations) {
          for (const [k, v] of loaded.issuerRegistrations) {
            issuerRegistrations.set(k, v as IssuerRegistration);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[zkclinic-verification-api] failed to hydrate persisted stores:", e);
      }
    }
  }

  function randomHex(size: number): string {
    return Buffer.from(randomBytes(size)).toString("hex");
  }

  function generateRequestCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Buffer.from(randomBytes(1))[0]! % chars.length];
    }
    return code;
  }

  async function validateIcd10List(
    codes: string[]
  ): Promise<{ invalid: string[]; resolved: Record<string, string> }> {
    const invalid: string[] = [];
    const resolved: Record<string, string> = {};
    for (const raw of codes) {
      const code = raw.trim();
      if (!code) continue;
      const hit = await resolveIcd10Exact(code);
      if (!hit) invalid.push(code);
      else resolved[hit.code] = hit.name;
    }
    return { invalid, resolved };
  }

  async function validateIcd11List(
    codes: string[]
  ): Promise<{ invalid: string[]; resolved: Record<string, string> }> {
    const invalid: string[] = [];
    const resolved: Record<string, string> = {};
    for (const raw of codes) {
      const code = raw.trim();
      if (!code) continue;
      const hit = await whoLookupMmsCode(code);
      if (!hit) invalid.push(code);
      else resolved[hit.code] = hit.title;
    }
    return { invalid, resolved };
  }

  async function validateTrialCriteriaLogic(criteria: TrialCriteriaV1): Promise<{
    ok: boolean;
    errors: string[];
    resolved?: Record<string, string>;
  }> {
    if (looseTrialValidation) {
      const resolved: Record<string, string> = {};
      for (const c of criteria.inclusionIcd10 ?? []) {
        const k = c.trim();
        if (k) resolved[k] = "(mock — ICD-10 not verified)";
      }
      for (const c of criteria.exclusionIcd10 ?? []) {
        const k = c.trim();
        if (k) resolved[k] = "(mock — ICD-10 not verified)";
      }
      for (const c of criteria.inclusionIcd11 ?? []) {
        const k = c.trim();
        if (k) resolved[k] = "(mock — ICD-11 not verified)";
      }
      for (const c of criteria.exclusionIcd11 ?? []) {
        const k = c.trim();
        if (k) resolved[k] = "(mock — ICD-11 not verified)";
      }
      return { ok: true, errors: [], resolved };
    }

    const errors: string[] = [];
    const inc10 = criteria.inclusionIcd10 ?? [];
    const exc10 = criteria.exclusionIcd10 ?? [];
    const inc11 = criteria.inclusionIcd11 ?? [];
    const exc11 = criteria.exclusionIcd11 ?? [];

    if (!criteria.title?.trim()) errors.push("Title is required");
    if (!inc10.length && !inc11.length) {
      errors.push("At least one inclusion ICD-10 or ICD-11 code is required");
    }
    if (criteria.ageMin != null && (criteria.ageMin < 0 || criteria.ageMin > 120)) errors.push("ageMin must be 0–120");
    if (criteria.ageMax != null && (criteria.ageMax < 0 || criteria.ageMax > 120)) errors.push("ageMax must be 0–120");
    if (criteria.ageMin != null && criteria.ageMax != null && criteria.ageMin > criteria.ageMax) {
      errors.push("ageMin cannot exceed ageMax");
    }
    if (criteria.eligibilityThresholdPercent != null) {
      const e = criteria.eligibilityThresholdPercent;
      if (!Number.isFinite(e) || e < 1 || e > 100) {
        errors.push("eligibilityThresholdPercent must be 1–100");
      }
    }
    for (const lab of criteria.labCriteria ?? []) {
      if (!lab.testName?.trim()) errors.push("Each lab row needs a test name");
      if (Number.isNaN(lab.threshold)) errors.push("Lab threshold must be a number");
    }
    const inc = await validateIcd10List(inc10);
    if (inc.invalid.length) errors.push(`Unknown inclusion ICD-10: ${inc.invalid.join(", ")}`);
    const exc = await validateIcd10List(exc10);
    if (exc.invalid.length) errors.push(`Unknown exclusion ICD-10: ${exc.invalid.join(", ")}`);
    const incI11 = await validateIcd11List(inc11);
    if (incI11.invalid.length) errors.push(`Unknown inclusion ICD-11: ${incI11.invalid.join(", ")}`);
    const excI11 = await validateIcd11List(exc11);
    if (excI11.invalid.length) errors.push(`Unknown exclusion ICD-11: ${excI11.invalid.join(", ")}`);
    if (errors.length > 0) return { ok: false, errors };
    return {
      ok: true,
      errors: [],
      resolved: { ...inc.resolved, ...exc.resolved, ...incI11.resolved, ...excI11.resolved }
    };
  }

  function withProofStatus(proof: StoredProof) {
    return {
      ...proof,
      expired: now() > proof.expiresAt
    };
  }

  function createAttestationHash(doctorPubKeyHex: string, licenseHash: string, t: number): string {
    return createHash("sha256")
      .update(Buffer.from(doctorPubKeyHex.replace(/^0x/, ""), "hex"))
      .update(Buffer.from(licenseHash.replace(/^0x/, ""), "hex"))
      .update(String(t))
      .digest("hex");
  }

  function zeroIssuerVerificationHex(): string {
    return "0".repeat(64);
  }

  const ISSUER_STATUS_RANK: Record<IssuerRegistrationStatus, number> = {
    rejected: 0,
    pending_verification: 1,
    pending_admin: 2,
    api_verified: 3,
    admin_approved: 4
  };

  function normDocKey(hex: string): string {
    return hex.replace(/^0x/, "").toLowerCase();
  }

  function normLicHash(lic: string): string {
    return lic.replace(/^0x/, "").toLowerCase();
  }

  function findIssuerRegistration(doc: string, lic: string): IssuerRegistration | undefined {
    const l = normLicHash(lic);
    const d = normDocKey(doc);
    let best: IssuerRegistration | undefined;
    for (const r of issuerRegistrations.values()) {
      if (r.doctorPubKeyHex !== d || normLicHash(r.licenseHash) !== l) continue;
      if (!best || ISSUER_STATUS_RANK[r.status] >= ISSUER_STATUS_RANK[best.status]) best = r;
    }
    return best;
  }

  async function computeRegistrationLicenseHash(parts: {
    doctorId: string;
    regdNoValue: string;
    imrRecordText?: string;
    certificateOcrText?: string;
  }): Promise<string> {
    return sha256HexUtf8(
      stableStringify({
        doctorId: parts.doctorId.trim().toLowerCase(),
        regdNoValue: parts.regdNoValue.trim(),
        imrRecordText: (parts.imrRecordText ?? "").trim(),
        certificateOcrText: (parts.certificateOcrText ?? "").trim()
      })
    );
  }

  /** Demo path: non-empty IMR excerpt + PDF upload placeholder → immediate api_verified (no background queue). */
  function isMockImrPdfAutoVerifyBundle(imrRecordText: string | undefined, certificateOcrText: string | undefined): boolean {
    const imrOk = (imrRecordText ?? "").trim().length >= 8;
    const cert = (certificateOcrText ?? "").trim();
    const pdfReceipt = /\[PDF uploaded:/i.test(cert);
    return imrOk && pdfReceipt;
  }

  async function runIssuerVerificationJob(registrationId: string): Promise<void> {
    const reg = issuerRegistrations.get(registrationId);
    if (!reg || reg.status !== "pending_verification") return;
    try {
      const lic = normLicHash(reg.licenseHash);
      const nmc = await verifyDoctorNmc({
        doctorId: reg.doctorId,
        regdNoValue: reg.regdNoValue,
        licenseHash: lic,
        ocrNameHint: reg.ocrNameHint,
        ocrSmcHint: reg.ocrSmcHint
      });
      const t = now();
      const base: IssuerRegistration = {
        ...reg,
        verificationPayloadHash: nmc.verificationPayloadHash,
        reasons: nmc.reasons,
        confidence: nmc.confidence,
        updatedAt: t
      };
      if (nmc.riskBand === "high") {
        issuerRegistrations.set(registrationId, { ...base, status: "api_verified" });
      } else if (nmc.riskBand === "medium") {
        const reviewId = randomHex(16);
        doctorReviewQueue.set(reviewId, {
          reviewId,
          doctorPubKeyHex: reg.doctorPubKeyHex,
          licenseHash: lic,
          verificationPayloadHash: nmc.verificationPayloadHash,
          riskBand: nmc.riskBand,
          confidence: nmc.confidence,
          reasons: nmc.reasons,
          createdAt: t,
          issuerRegistrationId: registrationId
        });
        issuerRegistrations.set(registrationId, { ...base, status: "pending_admin", reviewId });
      } else {
        issuerRegistrations.set(registrationId, { ...base, status: "rejected" });
      }
    } catch (e) {
      issuerRegistrations.set(registrationId, {
        ...reg,
        status: "rejected",
        reasons: [e instanceof Error ? e.message : String(e)],
        updatedAt: now()
      });
    }
    persistStores();
  }

  function assertPatientIntakeSize(intake: PatientIntakeV1 | undefined): string | null {
    if (intake == null) return null;
    try {
      if (JSON.stringify(intake).length > 48_000) return "patientIntake JSON exceeds size limit";
    } catch {
      return "patientIntake is not serializable";
    }
    return null;
  }

  const TRIAL_AUTOFILL_SYSTEM = `You are a clinical-trial protocol assistant. The user describes a study in free text.
Return ONLY valid JSON (no markdown) matching this TypeScript-like shape — use null or omit optional fields:
{
  "title": string,
  "shortDescription": string | null,
  "inclusionIcd10": string[],
  "exclusionIcd10": string[],
  "inclusionIcd11": string[],
  "exclusionIcd11": string[],
  "exclusionMedications": string[],
  "ageMin": number | null,
  "ageMax": number | null,
  "eligibilityThresholdPercent": number | null,
  "labCriteria": Array<{ "testName": string, "operator": "=" | "<" | ">" | "<=" | ">=", "threshold": number, "unit": string }>
}
Use empty arrays where unknown. ICD-10 codes should look like NLM ICD-10-CM (e.g. E11.9). ICD-11 MMS stem codes when you can infer them.`;

  const PATIENT_INTAKE_AUTOFILL_SYSTEM = `You are a medical intake assistant. From the user's narrative, extract structured history for a research/care coordination form.
Return ONLY valid JSON (no markdown) with optional fields:
{
  "chiefComplaint": string,
  "narrative": string,
  "conditions": Array<{ "label": string, "icd10": string | null, "icd11": string | null, "status": string, "approxOnset": string, "approxResolution": string, "notes": string }>,
  "medicationsList": string[],
  "medicationAllergies": string[],
  "allergies": string[],
  "environmentalAllergens": string[],
  "pastMedicalHistory": string,
  "surgicalHistory": string,
  "hospitalizations": string,
  "familyHistory": string,
  "immunizations": string,
  "socialHistory": string,
  "occupationalExposure": string,
  "currentSymptoms": string[]
}
Never invent precise ICD codes unless reasonably inferable; use null for unknown codes. Keep strings concise.`;

  server.get("/health", (_req, res, next) => {
    res.send({ ok: true, service: "zkclinic-verification-api" });
    return next();
  });

  server.post("/issuer-registration", async (req, res) => {
    const body = req.body as {
      doctorPubKeyHex?: string;
      doctorId?: string;
      regdNoValue?: string;
      licenseHash?: string;
      imrRecordText?: string;
      certificateOcrText?: string;
      ocrNameHint?: string;
      ocrSmcHint?: string;
    };
    const docRaw = body.doctorPubKeyHex?.trim();
    const doctorId = body.doctorId?.trim();
    const regdNoValue = body.regdNoValue?.trim();
    if (!docRaw || !doctorId || !regdNoValue) {
      res.send(400, { error: "doctorPubKeyHex, doctorId, and regdNoValue are required" });
      return;
    }
    const doc = normDocKey(docRaw);
    if (!/^[0-9a-f]{64}$/.test(doc)) {
      res.send(400, { error: "doctorPubKeyHex must be 64 hex chars" });
      return;
    }
    let lic = body.licenseHash?.trim();
    if (lic) {
      lic = normLicHash(lic);
      if (!/^[0-9a-f]{64}$/.test(lic)) {
        res.send(400, { error: "licenseHash must be 64 hex chars" });
        return;
      }
    } else {
      lic = await computeRegistrationLicenseHash({
        doctorId,
        regdNoValue,
        imrRecordText: body.imrRecordText,
        certificateOcrText: body.certificateOcrText
      });
    }
    const existing = findIssuerRegistration(doc, lic);
    if (existing && existing.status !== "rejected") {
      res.send(200, {
        registrationId: existing.registrationId,
        licenseHash: lic,
        status: existing.status,
        reviewId: existing.reviewId,
        reasons: existing.reasons,
        confidence: existing.confidence
      });
      return;
    }
    const registrationId = randomHex(16);
    const t = now();
    const imrTrim = body.imrRecordText?.trim() || undefined;
    const certTrim = body.certificateOcrText?.trim() || undefined;

    if (isMockImrPdfAutoVerifyBundle(imrTrim, certTrim)) {
      try {
        const nmc = await verifyDoctorNmc({
          doctorId,
          regdNoValue,
          licenseHash: lic,
          ocrNameHint: body.ocrNameHint?.trim(),
          ocrSmcHint: body.ocrSmcHint?.trim()
        });
        const reg: IssuerRegistration = {
          registrationId,
          doctorPubKeyHex: doc,
          licenseHash: lic,
          doctorId,
          regdNoValue,
          imrRecordText: imrTrim,
          certificateOcrText: certTrim,
          ocrNameHint: body.ocrNameHint?.trim() || undefined,
          ocrSmcHint: body.ocrSmcHint?.trim() || undefined,
          status: "api_verified",
          verificationPayloadHash: nmc.verificationPayloadHash,
          reasons: ["mock_imr_excerpt_and_pdf_receipt_verified", ...nmc.reasons],
          confidence: nmc.confidence,
          createdAt: t,
          updatedAt: t
        };
        issuerRegistrations.set(registrationId, reg);
        persistStores();
        res.send(200, {
          registrationId,
          licenseHash: lic,
          status: "api_verified",
          reviewId: reg.reviewId,
          reasons: reg.reasons,
          confidence: reg.confidence
        });
      } catch (e) {
        res.send(502, { error: e instanceof Error ? e.message : String(e) });
      }
      return;
    }

    const reg: IssuerRegistration = {
      registrationId,
      doctorPubKeyHex: doc,
      licenseHash: lic,
      doctorId,
      regdNoValue,
      imrRecordText: imrTrim,
      certificateOcrText: certTrim,
      ocrNameHint: body.ocrNameHint?.trim() || undefined,
      ocrSmcHint: body.ocrSmcHint?.trim() || undefined,
      status: "pending_verification",
      createdAt: t,
      updatedAt: t
    };
    issuerRegistrations.set(registrationId, reg);
    persistStores();
    res.send(202, {
      registrationId,
      licenseHash: lic,
      status: "pending_verification"
    });
    setImmediate(() => void runIssuerVerificationJob(registrationId));
  });

  server.get("/issuer-registration/status", (req, res, next) => {
    const q = req.query as { registrationId?: string; doctorPubKeyHex?: string; licenseHash?: string };
    if (q.registrationId?.trim()) {
      const r = issuerRegistrations.get(q.registrationId.trim().toLowerCase());
      if (!r) {
        res.send(404, { error: "Unknown registrationId" });
        return next();
      }
      res.send({
        registrationId: r.registrationId,
        licenseHash: normLicHash(r.licenseHash),
        status: r.status,
        reviewId: r.reviewId,
        reasons: r.reasons,
        confidence: r.confidence,
        updatedAt: r.updatedAt
      });
      return next();
    }
    const doc = q.doctorPubKeyHex?.trim();
    const lic = q.licenseHash?.trim();
    if (!doc || !lic) {
      res.send(400, { error: "Provide registrationId or doctorPubKeyHex+licenseHash" });
      return next();
    }
    const r = findIssuerRegistration(doc, lic);
    if (!r) {
      res.send(404, { error: "No registration for this doctor and license hash" });
      return next();
    }
    res.send({
      registrationId: r.registrationId,
      licenseHash: normLicHash(r.licenseHash),
      status: r.status,
      reviewId: r.reviewId,
      reasons: r.reasons,
      confidence: r.confidence,
      updatedAt: r.updatedAt
    });
    return next();
  });

  server.get("/issuer-registrations", (req, res, next) => {
    const token = req.header("x-zkclinic-admin-token") ?? (req.query as { token?: string }).token;
    const expected = process.env.ZKCLINIC_ADMIN_TOKEN;
    if (!expected || token !== expected) {
      res.send(401, { error: "Unauthorized" });
      return next();
    }
    res.send({
      registrations: Array.from(issuerRegistrations.values()).sort((a, b) => b.updatedAt - a.updatedAt)
    });
    return next();
  });

  server.post("/issuer-registrations/:registrationId/admin-approve", (req, res, next) => {
    const token = req.header("x-zkclinic-admin-token");
    const expected = process.env.ZKCLINIC_ADMIN_TOKEN;
    if (!expected || token !== expected) {
      res.send(401, { error: "Unauthorized" });
      return next();
    }
    const registrationId = (req.params as { registrationId: string }).registrationId?.toLowerCase();
    const reg = registrationId ? issuerRegistrations.get(registrationId) : undefined;
    if (!reg) {
      res.send(404, { error: "Registration not found" });
      return next();
    }
    const t = now();
    issuerRegistrations.set(registrationId!, {
      ...reg,
      status: "admin_approved",
      verificationPayloadHash: reg.verificationPayloadHash ?? zeroIssuerVerificationHex(),
      updatedAt: t
    });
    persistStores();
    res.send({ ok: true, registrationId, status: "admin_approved" });
    return next();
  });

  server.post("/assistant/fill-trial-criteria", async (req, res) => {
    const { prompt } = req.body as { prompt?: string };
    const text = prompt?.trim() ?? "";
    if (!text) {
      res.send(400, { error: "prompt required" });
      return;
    }
    if (text.length > 12_000) {
      res.send(400, { error: "prompt too long" });
      return;
    }
    try {
      const raw = await geminiGenerateJson(TRIAL_AUTOFILL_SYSTEM, text);
      res.send(200, { partial: raw });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("GEMINI_API_KEY")) {
        res.send(503, { error: "Assistant unavailable (set GEMINI_API_KEY on the verification API)" });
        return;
      }
      res.send(502, { error: msg });
    }
  });

  server.post("/assistant/fill-patient-intake", async (req, res) => {
    const { prompt } = req.body as { prompt?: string };
    const text = prompt?.trim() ?? "";
    if (!text) {
      res.send(400, { error: "prompt required" });
      return;
    }
    if (text.length > 12_000) {
      res.send(400, { error: "prompt too long" });
      return;
    }
    try {
      const raw = await geminiGenerateJson(PATIENT_INTAKE_AUTOFILL_SYSTEM, text);
      res.send(200, { patientIntake: raw });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("GEMINI_API_KEY")) {
        res.send(503, { error: "Assistant unavailable (set GEMINI_API_KEY on the verification API)" });
        return;
      }
      res.send(502, { error: msg });
    }
  });

  server.post("/verify-license", (req, res, next) => {
    const { countryCode } = req.body as { countryCode?: string };
    const supported = countryCode === "US" || countryCode === "CA" || countryCode === "GB";
    res.send({
      supported,
      mode: supported ? "standard" : "fallback-manual-review"
    });
    return next();
  });

  server.post("/icd11/text-to-code", async (req, res) => {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.send(400, { error: "text required" });
      return;
    }
    try {
      const { candidates, warnings } = await textToIcd11Pipeline(text);
      res.send(200, { candidates, warnings });
    } catch (e) {
      res.send(500, { error: e instanceof Error ? e.message : String(e) });
    }
  });

  server.post("/icd11/code-to-text", async (req, res) => {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) {
      res.send(400, { error: "code required" });
      return;
    }
    try {
      const { candidate, warnings } = await codeToIcd11Text(code);
      res.send(200, { candidate, warnings });
    } catch (e) {
      res.send(500, { error: e instanceof Error ? e.message : String(e) });
    }
  });

  server.post("/doctor-verification/nmc-check", async (req, res) => {
    const body = req.body as {
      doctorId?: string;
      regdNoValue?: string;
      licenseHash?: string;
      ocrNameHint?: string;
      ocrSmcHint?: string;
    };
    if (!body.doctorId?.trim() || !body.regdNoValue?.trim() || !body.licenseHash?.trim()) {
      res.send(400, { error: "doctorId, regdNoValue, and licenseHash required" });
      return;
    }
    try {
      const result = await verifyDoctorNmc({
        doctorId: body.doctorId.trim(),
        regdNoValue: body.regdNoValue.trim(),
        licenseHash: body.licenseHash.trim(),
        ocrNameHint: body.ocrNameHint,
        ocrSmcHint: body.ocrSmcHint
      });
      const { raw: _raw, ...rest } = result;
      res.send(200, { ...rest, nmc: result.raw });
    } catch (e) {
      res.send(502, { error: e instanceof Error ? e.message : String(e) });
    }
  });

  server.get("/doctor-verification/reviews", (req, res, next) => {
    const token = req.header("x-zkclinic-admin-token") ?? (req.query as { token?: string }).token;
    const expected = process.env.ZKCLINIC_ADMIN_TOKEN;
    if (!expected || token !== expected) {
      res.send(401, { error: "Unauthorized" });
      return next();
    }
    res.send({
      reviews: Array.from(doctorReviewQueue.values()).sort((a, b) => b.createdAt - a.createdAt)
    });
    return next();
  });

  server.post("/doctor-verification/reviews/:reviewId/approve", (req, res, next) => {
    const token = req.header("x-zkclinic-admin-token");
    const expected = process.env.ZKCLINIC_ADMIN_TOKEN;
    if (!expected || token !== expected) {
      res.send(401, { error: "Unauthorized" });
      return next();
    }
    const reviewId = (req.params as { reviewId: string }).reviewId?.toLowerCase();
    const entry = reviewId ? doctorReviewQueue.get(reviewId) : undefined;
    if (!entry) {
      res.send(404, { error: "Review not found" });
      return next();
    }
    doctorReviewQueue.delete(reviewId!);
    if (entry.issuerRegistrationId) {
      const ir = issuerRegistrations.get(entry.issuerRegistrationId);
      if (ir) {
        issuerRegistrations.set(entry.issuerRegistrationId, {
          ...ir,
          status: "admin_approved",
          updatedAt: now()
        });
      }
    }
    persistStores();
    const t = now();
    const attestationHash = createAttestationHash(entry.doctorPubKeyHex, entry.licenseHash, t);
    res.send({
      verified: true,
      attestationHash,
      issuerVerificationHash: entry.verificationPayloadHash,
      doctorPubKeyHex: entry.doctorPubKeyHex,
      licenseHash: entry.licenseHash,
      reviewId: entry.reviewId
    });
    return next();
  });

  server.post("/attest-doctor", async (req, res) => {
    const body = req.body as {
      doctorPubKeyHex?: string;
      licenseHash?: string;
      verification?: {
        doctorId?: string;
        regdNoValue?: string;
        ocrNameHint?: string;
        ocrSmcHint?: string;
      };
    };
    const doctorPubKeyHex = body.doctorPubKeyHex;
    const { licenseHash } = body;
    if (!doctorPubKeyHex || !licenseHash) {
      res.send(400, { error: "doctorPubKeyHex and licenseHash required" });
      return;
    }
    const doc = normDocKey(doctorPubKeyHex);
    if (!/^[0-9a-f]{64}$/.test(doc)) {
      res.send(400, { error: "doctorPubKeyHex must be 64 hex chars" });
      return;
    }
    const lic = normLicHash(licenseHash);
    if (!/^[0-9a-f]{64}$/.test(lic)) {
      res.send(400, { error: "licenseHash must be 64 hex chars" });
      return;
    }

    const inlineNmc =
      Boolean(body.verification?.doctorId?.trim()) && Boolean(body.verification?.regdNoValue?.trim());

    if (inlineNmc) {
      try {
        const nmc = await verifyDoctorNmc({
          doctorId: body.verification!.doctorId!.trim(),
          regdNoValue: body.verification!.regdNoValue!.trim(),
          licenseHash: lic,
          ocrNameHint: body.verification?.ocrNameHint,
          ocrSmcHint: body.verification?.ocrSmcHint
        });
        if (nmc.riskBand === "low") {
          res.send(403, {
            verified: false,
            reasons: nmc.reasons,
            confidence: nmc.confidence
          });
          return;
        }
        if (nmc.riskBand === "medium") {
          const reviewId = randomHex(16);
          doctorReviewQueue.set(reviewId, {
            reviewId,
            doctorPubKeyHex: doc,
            licenseHash: lic,
            verificationPayloadHash: nmc.verificationPayloadHash,
            riskBand: nmc.riskBand,
            confidence: nmc.confidence,
            reasons: nmc.reasons,
            createdAt: now()
          });
          persistStores();
          res.send(202, {
            verified: false,
            pendingReview: true,
            reviewId,
            reasons: nmc.reasons,
            confidence: nmc.confidence,
            issuerVerificationHash: nmc.verificationPayloadHash
          });
          return;
        }
        const t = now();
        const attestationHash = createAttestationHash(doc, lic, t);
        res.send({
          verified: true,
          attestationHash,
          issuerVerificationHash: nmc.verificationPayloadHash,
          doctorPubKeyHex: doc,
          licenseHash: lic
        });
        return;
      } catch (e) {
        res.send(502, { error: e instanceof Error ? e.message : String(e) });
        return;
      }
    }

    const reg = findIssuerRegistration(doc, lic);
    if (reg) {
      if (reg.status === "pending_verification") {
        res.send(409, {
          error: "Issuer registration is still being verified in the background",
          status: reg.status,
          registrationId: reg.registrationId
        });
        return;
      }
      if (reg.status === "rejected") {
        res.send(403, {
          verified: false,
          reasons: reg.reasons ?? ["Issuer registration was rejected"],
          registrationId: reg.registrationId
        });
        return;
      }
      if (reg.status === "pending_admin") {
        let reviewId = reg.reviewId;
        if (!reviewId || !doctorReviewQueue.has(reviewId)) {
          reviewId = randomHex(16);
          const vh = reg.verificationPayloadHash ?? zeroIssuerVerificationHex();
          doctorReviewQueue.set(reviewId, {
            reviewId,
            doctorPubKeyHex: doc,
            licenseHash: lic,
            verificationPayloadHash: vh,
            riskBand: "medium",
            confidence: reg.confidence ?? 0.5,
            reasons: reg.reasons?.length ? reg.reasons : ["Pending manual review"],
            createdAt: now(),
            issuerRegistrationId: reg.registrationId
          });
          issuerRegistrations.set(reg.registrationId, { ...reg, reviewId, updatedAt: now() });
          persistStores();
        }
        res.send(202, {
          verified: false,
          pendingReview: true,
          reviewId,
          reasons: reg.reasons ?? [],
          confidence: reg.confidence,
          issuerVerificationHash: reg.verificationPayloadHash ?? zeroIssuerVerificationHex(),
          registrationId: reg.registrationId
        });
        return;
      }
      if (reg.status === "api_verified" || reg.status === "admin_approved") {
        const t = now();
        const attestationHash = createAttestationHash(doc, lic, t);
        res.send({
          verified: true,
          attestationHash,
          issuerVerificationHash: reg.verificationPayloadHash ?? zeroIssuerVerificationHex(),
          doctorPubKeyHex: doc,
          licenseHash: lic,
          registrationId: reg.registrationId
        });
        return;
      }
    }

    const t = now();
    const attestationHash = createAttestationHash(doc, lic, t);
    res.send({
      verified: true,
      attestationHash,
      issuerVerificationHash: zeroIssuerVerificationHex(),
      doctorPubKeyHex: doc,
      licenseHash: lic
    });
  });

  server.post("/credential-requests", (req, res, next) => {
    const { patientId, patientIntake, continuingCredentialId } = req.body as {
      patientId?: string;
      patientIntake?: PatientIntakeV1;
      continuingCredentialId?: string;
    };
    const sizeErr = assertPatientIntakeSize(patientIntake);
    if (sizeErr) {
      res.send(400, { error: sizeErr });
      return next();
    }
    const cont = continuingCredentialId?.trim().replace(/^0x/i, "").toLowerCase();
    if (cont && !/^[0-9a-f]{64}$/.test(cont)) {
      res.send(400, { error: "continuingCredentialId must be 64 hex characters" });
      return next();
    }
    let code = generateRequestCode();
    while (credentialRequests.has(code)) {
      code = generateRequestCode();
    }
    const request: CredentialRequest = {
      requestId: randomHex(16),
      requestCode: code,
      patientId: patientId ?? undefined,
      continuingCredentialId: cont || undefined,
      patientIntake: patientIntake ?? undefined,
      createdAt: now()
    };
    credentialRequests.set(code, request);
    persistStores();
    res.send(201, { requestCode: code, requestId: request.requestId });
    return next();
  });

  server.get("/credential-requests/:code", (req, res, next) => {
    const code = (req.params as { code: string }).code?.toUpperCase();
    if (!code) {
      res.send(400, { error: "Request code required" });
      return next();
    }
    const request = credentialRequests.get(code);
    if (!request) {
      res.send(404, { error: "Request not found" });
      return next();
    }
    res.send({
      requestId: request.requestId,
      requestCode: request.requestCode,
      patientId: request.patientId,
      continuingCredentialId: request.continuingCredentialId,
      hasContinuingCredentialId: !!request.continuingCredentialId,
      patientIntake: request.patientIntake,
      hasPatientIntake: !!request.patientIntake,
      createdAt: request.createdAt,
      hasCredential: !!request.credential
    });
    return next();
  });

  server.post("/credential-requests/:code/credential", (req, res, next) => {
    const code = (req.params as { code: string }).code?.toUpperCase();
    const { encryptedCredential, credentialId } = req.body as {
      encryptedCredential?: string;
      credentialId?: string;
    };
    if (!code || !encryptedCredential || !credentialId) {
      res.send(400, { error: "code, encryptedCredential and credentialId required" });
      return next();
    }
    const request = credentialRequests.get(code);
    if (!request) {
      res.send(404, { error: "Request not found" });
      return next();
    }
    if (request.credential) {
      res.send(409, { error: "Credential already delivered for this request" });
      return next();
    }
    request.credential = {
      encryptedCredential,
      credentialId,
      deliveredAt: now()
    };
    persistStores();
    res.send(201, { ok: true, credentialId });
    return next();
  });

  server.get("/credential-requests/:code/credential", (req, res, next) => {
    const code = (req.params as { code: string }).code?.toUpperCase();
    if (!code) {
      res.send(400, { error: "Request code required" });
      return next();
    }
    const request = credentialRequests.get(code);
    if (!request) {
      res.send(404, { error: "Request not found" });
      return next();
    }
    if (!request.credential) {
      res.send(404, { error: "Credential not yet delivered" });
      return next();
    }
    res.send(request.credential);
    return next();
  });

  server.post("/trials/validate", async (req, res) => {
    try {
      const { criteria: raw } = req.body as { criteria?: TrialCriteriaV1 };
      if (!raw || raw.version !== 1) {
        res.send(400, { ok: false, errors: ["criteria.version must be 1"] });
        return;
      }
      const criteria = trialCriteriaWireForm(raw);
      const result = await validateTrialCriteriaLogic(criteria);
      if (!result.ok) {
        res.send(200, { ok: false, errors: result.errors });
        return;
      }
      res.send(200, { ok: true, resolved: result.resolved ?? {} });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[zkclinic-verification-api] /trials/validate error:", e);
      res.send(500, { ok: false, errors: [`Server error during validation: ${msg}`] });
    }
  });

  server.post("/trials", async (req, res) => {
    try {
      const body = req.body as {
        trialIdHex?: string;
        criteria?: TrialCriteriaV1;
        criteriaHashHex?: string;
        managerPubKeyHex?: string;
      };
      const { trialIdHex, criteria: rawCriteria, criteriaHashHex, managerPubKeyHex } = body;
      if (!trialIdHex || !rawCriteria || !criteriaHashHex) {
        res.send(400, { error: "trialIdHex, criteria, and criteriaHashHex required" });
        return;
      }
      const criteria = trialCriteriaWireForm(rawCriteria);
      const cleanId = trialIdHex.replace(/^0x/, "").toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(cleanId)) {
        res.send(400, { error: "trialIdHex must be 64 hex chars" });
        return;
      }
      if (criteria.version !== 1 || criteria.trialId !== cleanId) {
        res.send(400, { error: "criteria.trialId must match trialIdHex" });
        return;
      }
      const computed = await sha256HexUtf8(stableStringify(criteria));
      if (computed !== criteriaHashHex.replace(/^0x/, "").toLowerCase()) {
        res.send(400, { error: "criteriaHashHex does not match canonical criteria JSON" });
        return;
      }
      const validation = await validateTrialCriteriaLogic(criteria);
      if (!validation.ok) {
        res.send(400, { error: "Validation failed", details: validation.errors });
        return;
      }
      if (trialsStore.has(cleanId)) {
        res.send(409, { error: "Trial already registered in API store" });
        return;
      }
      trialsStore.set(cleanId, {
        trialIdHex: cleanId,
        criteria,
        criteriaHashHex: computed,
        postedAt: now(),
        managerPubKeyHex
      });
      persistStores();
      res.send(201, { ok: true, trialIdHex: cleanId, criteriaHashHex: computed });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[zkclinic-verification-api] POST /trials error:", e);
      res.send(500, { error: `Server error while registering trial: ${msg}` });
    }
  });

  server.get("/trials", (_req, res, next) => {
    res.send({
      trials: Array.from(trialsStore.values()).sort((a, b) => b.postedAt - a.postedAt)
    });
    return next();
  });

  server.get("/trials/:trialIdHex", (req, res, next) => {
    const id = (req.params as { trialIdHex: string }).trialIdHex?.replace(/^0x/, "").toLowerCase();
    if (!id || !/^[0-9a-f]{64}$/.test(id)) {
      res.send(400, { error: "Invalid trial id" });
      return next();
    }
    const trial = trialsStore.get(id);
    if (!trial) {
      res.send(404, { error: "Trial not found in API store" });
      return next();
    }
    res.send(trial);
    return next();
  });

  server.post("/proofs", (req, res, next) => {
    const body = req.body as {
      trialIdHex?: string;
      criteriaHashHex?: string;
      proof?: {
        pseudonym?: string;
        eligible?: boolean;
        matchPercent?: number;
        thresholdPercent?: number;
        createdAt?: number;
        expiresAt?: number;
        criterionResults?: ProofCriterionResult[];
      };
    };
    const trialIdHex = body.trialIdHex?.replace(/^0x/, "").toLowerCase();
    const criteriaHashHex = body.criteriaHashHex?.replace(/^0x/, "").toLowerCase();
    if (!trialIdHex || !criteriaHashHex || !body.proof) {
      res.send(400, { error: "trialIdHex, criteriaHashHex, and proof are required" });
      return next();
    }
    const trial = trialsStore.get(trialIdHex);
    if (!trial) {
      res.send(404, { error: "Trial not found in API store" });
      return next();
    }
    if (trial.criteriaHashHex !== criteriaHashHex) {
      res.send(409, { error: "criteriaHashHex does not match registered trial metadata" });
      return next();
    }
    const proofId = randomHex(16);
    const createdAt = body.proof.createdAt ?? now();
    const expiresAt = body.proof.expiresAt ?? createdAt + DEFAULT_PROOF_VALIDITY_MS;
    const mp = body.proof.matchPercent;
    const tp = body.proof.thresholdPercent;
    const proof: StoredProof = {
      proofId,
      trialIdHex,
      trialTitle: trial.criteria.title,
      criteriaHashHex,
      managerPubKeyHex: trial.managerPubKeyHex,
      pseudonym: body.proof.pseudonym?.trim() || `anon-${proofId.slice(0, 12)}`,
      eligible: Boolean(body.proof.eligible),
      matchPercent: typeof mp === "number" && Number.isFinite(mp) ? Math.round(mp) : undefined,
      thresholdPercent: typeof tp === "number" && Number.isFinite(tp) ? Math.round(tp) : undefined,
      criterionResults: Array.isArray(body.proof.criterionResults) ? body.proof.criterionResults : [],
      createdAt,
      expiresAt,
      messages: []
    };
    proofsStore.set(proofId, proof);
    persistStores();
    res.send(201, withProofStatus(proof));
    return next();
  });

  server.get("/proofs", (req, res, next) => {
    const query = req.query as {
      managerPubKeyHex?: string;
      trialIdHex?: string;
      proofId?: string;
    };
    const manager = query.managerPubKeyHex?.replace(/^0x/, "").toLowerCase();
    const trialId = query.trialIdHex?.replace(/^0x/, "").toLowerCase();
    const proofId = query.proofId?.trim().toLowerCase();

    let proofs = Array.from(proofsStore.values());
    if (manager) {
      proofs = proofs.filter((proof) => proof.managerPubKeyHex?.toLowerCase() === manager);
    }
    if (trialId) {
      proofs = proofs.filter((proof) => proof.trialIdHex === trialId);
    }
    if (proofId) {
      proofs = proofs.filter((proof) => proof.proofId === proofId);
    }
    res.send({
      proofs: proofs
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((proof) => withProofStatus(proof))
    });
    return next();
  });

  server.post("/proofs/:proofId/messages", (req, res, next) => {
    const proofId = (req.params as { proofId: string }).proofId?.toLowerCase();
    const body = (req.body as { body?: string }).body?.trim();
    if (!proofId || !body) {
      res.send(400, { error: "proofId and message body are required" });
      return next();
    }
    const proof = proofsStore.get(proofId);
    if (!proof) {
      res.send(404, { error: "Proof not found" });
      return next();
    }
    const message: ProofMessage = {
      messageId: randomHex(12),
      proofId,
      sentAt: now(),
      body
    };
    proof.messages.unshift(message);
    persistStores();
    res.send(201, message);
    return next();
  });

  server.post("/proofs/:proofId/reveal", (req, res, next) => {
    const proofId = (req.params as { proofId: string }).proofId?.toLowerCase();
    const patientIdentity = (req.body as { patientIdentity?: string }).patientIdentity?.trim();
    if (!proofId || !patientIdentity) {
      res.send(400, { error: "proofId and patientIdentity are required" });
      return next();
    }
    const proof = proofsStore.get(proofId);
    if (!proof) {
      res.send(404, { error: "Proof not found" });
      return next();
    }
    proof.revealedIdentity = patientIdentity;
    persistStores();
    res.send(200, withProofStatus(proof));
    return next();
  });

  server.get("/notifications", (req, res, next) => {
    const proofIdsRaw = String((req.query as { proofIds?: string }).proofIds ?? "");
    const proofIds = proofIdsRaw
      .split(",")
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean);
    const notifications = Array.from(proofsStore.values())
      .filter((proof) => proofIds.length === 0 || proofIds.includes(proof.proofId))
      .flatMap((proof) =>
        proof.messages.map((message) => ({
          ...message,
          trialIdHex: proof.trialIdHex,
          trialTitle: proof.trialTitle,
          expired: now() > proof.expiresAt
        }))
      )
      .sort((a, b) => b.sentAt - a.sentAt);
    res.send({ notifications });
    return next();
  });

  if (process.env.ZKCLINIC_ALLOW_DEMO_SEED === "1") {
    server.post("/demo/seed", async (_req, res) => {
      const added: string[] = [];
      const demos: TrialCriteriaV1[] = [
        {
          version: 1,
          trialId: `${"a".repeat(60)}1111`,
          title: "Demo — Eligible path (Type 2 diabetes)",
          shortDescription: "Inclusion E11.9 — use with a credential that lists E11.9",
          inclusionIcd10: ["E11.9"],
          exclusionIcd10: [],
          exclusionMedications: [],
          labCriteria: []
        },
        {
          version: 1,
          trialId: `${"b".repeat(60)}2222`,
          title: "Demo — Narrow inclusion (unlikely match)",
          shortDescription: "Requires E10.9 only — for ineligible demos",
          inclusionIcd10: ["E10.9"],
          exclusionIcd10: [],
          exclusionMedications: [],
          labCriteria: []
        }
      ];

      for (const criteria of demos) {
        const cleanId = criteria.trialId.replace(/^0x/, "").toLowerCase();
        if (trialsStore.has(cleanId)) continue;
        const validation = await validateTrialCriteriaLogic(criteria);
        if (!validation.ok) {
          res.send(500, { error: "Demo validation failed", details: validation.errors });
          return;
        }
        const computed = await sha256HexUtf8(stableStringify(criteria));
        trialsStore.set(cleanId, {
          trialIdHex: cleanId,
          criteria,
          criteriaHashHex: computed,
          postedAt: now()
        });
        added.push(cleanId);
      }
      persistStores();
      res.send(201, { ok: true, addedTrials: added.length, trialIds: added });
    });
  }

  return {
    server,
    stores: {
      credentialRequests,
      trialsStore,
      proofsStore,
      doctorReviewQueue
    }
  };
}
