/**
 * Maps the app-level credential / trial-criteria JSON onto the fixed-size structs the
 * `proveEligibility` circuit checks. Doctor, patient and trial manager must all use these
 * so the bytes compared inside the circuit agree.
 */
import type { EligibilityCriteria, HealthAttributes } from "./managed/zkclinic/contract/index.js";

const SLOTS = 4;
const UINT32_MAX = 4294967295;
const ZERO = () => new Uint8Array(32);

/** "e11.9 " -> bytes of "E11.9", zero padded to 32 (same normalization for ICD codes and lab names). */
export const codeBytes = (text: string): Uint8Array => {
  const out = ZERO();
  out.set(new TextEncoder().encode(text.trim().toUpperCase().replace(/\s+/g, "")).slice(0, 32));
  return out;
};

const scaled = (n: number): number => Math.round(n * 100);

export type CredentialLike = {
  ageYears?: number;
  icd10Codes?: string[];
  icd11Codes?: string[];
  labResults?: { testName: string; value: number }[];
  /** Unix milliseconds (as stored in the credential payload). */
  expiresAt: number;
};

/** First 4 diagnoses and first 4 labs are attested. shortcut: fixed 4 slots, raise the Vector sizes in the contract if cards need more. */
export const attributesFromCredential = (c: CredentialLike, salt: Uint8Array): HealthAttributes => {
  const codes = [...(c.icd10Codes ?? []), ...(c.icd11Codes ?? [])].filter((x) => x.trim()).slice(0, SLOTS);
  const labs = (c.labResults ?? []).filter((l) => l.testName.trim() && Number.isFinite(l.value)).slice(0, SLOTS);
  return {
    ageYears: BigInt(Math.min(255, Math.max(0, Math.floor(c.ageYears ?? 0)))),
    diagnoses: Array.from({ length: SLOTS }, (_, i) => (codes[i] ? codeBytes(codes[i]) : ZERO())),
    labs: Array.from({ length: SLOTS }, (_, i) =>
      labs[i]
        ? { code: codeBytes(labs[i].testName), value: BigInt(Math.min(UINT32_MAX, Math.max(0, scaled(labs[i].value)))) }
        : { code: ZERO(), value: 0n }
    ),
    expiresAt: BigInt(Math.floor(c.expiresAt / 1000)),
    salt
  };
};

export type CriteriaLike = {
  ageMin?: number;
  ageMax?: number;
  inclusionIcd10?: string[];
  inclusionIcd11?: string[];
  exclusionIcd10?: string[];
  exclusionIcd11?: string[];
  labCriteria?: { testName: string; operator: "=" | "<" | ">" | "<=" | ">="; threshold: number }[];
};

/**
 * The circuit enforces: age range, the first inclusion diagnosis, the first exclusion diagnosis
 * and the first lab rule. Remaining rules stay in the off-chain criteria document (criteriaHash).
 */
export const criteriaFromTrial = (c: CriteriaLike): EligibilityCriteria => {
  const required = [...(c.inclusionIcd10 ?? []), ...(c.inclusionIcd11 ?? [])].find((x) => x.trim());
  if (!required) throw new Error("Trial needs at least one inclusion diagnosis code");
  const excluded = [...(c.exclusionIcd10 ?? []), ...(c.exclusionIcd11 ?? [])].find((x) => x.trim());
  const lab = (c.labCriteria ?? []).find((l) => l.testName.trim() && Number.isFinite(l.threshold));
  let labMin = 0;
  let labMax = lab ? UINT32_MAX : 0;
  if (lab) {
    const t = scaled(lab.threshold);
    if (lab.operator === "=") labMin = labMax = t;
    else if (lab.operator === ">=") labMin = t;
    else if (lab.operator === ">") labMin = t + 1;
    else if (lab.operator === "<=") labMax = t;
    else labMax = t - 1;
    if (labMin < 0 || labMax < labMin) throw new Error(`Lab rule "${lab.testName} ${lab.operator} ${lab.threshold}" can never match`);
  }
  return {
    minAge: BigInt(Math.max(0, Math.floor(c.ageMin ?? 0))),
    maxAge: BigInt(Math.min(255, Math.floor(c.ageMax ?? 255))),
    requiredDiagnosis: codeBytes(required),
    excludedDiagnosis: excluded ? codeBytes(excluded) : ZERO(),
    labCode: lab ? codeBytes(lab.testName) : ZERO(),
    labMin: BigInt(labMin),
    labMax: BigInt(labMax)
  };
};

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16));

/** JSON-safe form, so attested attributes can travel inside the encrypted credential payload. */
export type HealthAttributesJson = {
  ageYears: number;
  diagnoses: string[];
  labs: { code: string; value: number }[];
  expiresAt: number;
  salt: string;
};

export const attributesToJson = (a: HealthAttributes): HealthAttributesJson => ({
  ageYears: Number(a.ageYears),
  diagnoses: a.diagnoses.map(hex),
  labs: a.labs.map((l) => ({ code: hex(l.code), value: Number(l.value) })),
  expiresAt: Number(a.expiresAt),
  salt: hex(a.salt)
});

export const attributesFromJson = (j: HealthAttributesJson): HealthAttributes => ({
  ageYears: BigInt(j.ageYears),
  diagnoses: j.diagnoses.map(unhex),
  labs: j.labs.map((l) => ({ code: unhex(l.code), value: BigInt(l.value) })),
  expiresAt: BigInt(j.expiresAt),
  salt: unhex(j.salt)
});
