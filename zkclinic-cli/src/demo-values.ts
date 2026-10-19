/**
 * Fixed-format demo values for fast CLI copy-paste (local testing only).
 *
 * 64-hex protocol ids below are SHA-256 digests of stable UTF-8 labels (hex-encoded),
 * so they look like real commitment / protocol hashes while staying reproducible.
 * Labels: zkclinic-demo-license-v1, zkclinic-demo-trial-protocol-v1, etc.
 */

/** 64 hex — issuer license hash default (SHA-256("zkclinic-demo-license-v1")). */
export const DEMO_LICENSE_HASH =
  "a027873ccf91b623cbe3c3be6dfb0bf1262a5be20dff796a45413c5d00b29a45";

/** 64 hex — trial id default (SHA-256("zkclinic-demo-trial-protocol-v1")). */
export const DEMO_TRIAL_ID = "476a056bc356af860ee47a67bc776cab2e07f4ce830be93ac0851d8fcd2667f9";

/** 64 hex — trial criteria hash default (SHA-256("zkclinic-demo-criteria-hash-v1")). */
export const DEMO_CRITERIA_HASH = "07ba1d244237540cbc64da46ea75e3d7f01835a6aa3115a5bd1b20441e472c49";

/** 64 hex — credential id for register/revoke demos (SHA-256("zkclinic-demo-credential-card-v1")). */
export const DEMO_CREDENTIAL_ID = "ca845514181ca0b5061bc323a4e317d42d0d90a4306c21b7f6e26228eac9c7f2";

/** Paste when prompted for ICD-10 codes (doctor fulfill flow). */
export const DEMO_ICD10_LINE = "E11.9,I10,J45.20";

/** Optional patient label (credential request). */
export const DEMO_PATIENT_LABEL = "demo-patient";

/** Unified issuer-registration API (cross-usable with NMC mock). */
export const DEMO_DOCTOR_FULL_NAME = "Dr. Ananya Sharma";
export const DEMO_DOCTOR_ID = "6085963";
export const DEMO_REGISTRATION_NO = "DL45218";
export const DEMO_MEDICAL_COUNCIL = "Delhi Medical Council";

/** IMR excerpt for unified issuer-registration (must match UI mock path: ≥8 chars + PDF receipt). */
export const DEMO_IMR_RECORD_TEXT = `Indian Medical Register — excerpt (demo)
Doctor ID: 6085963
Registration No: DL45218
Name: Dr. Ananya Sharma`;

export function printDemoCopyPasteSheet(params: {
  doctorCoinPublicKeyHex: string;
  contractAddressHex: string;
  verificationApiUrl: string;
}): void {
  const { doctorCoinPublicKeyHex, contractAddressHex, verificationApiUrl } = params;
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  ZKClinic CLI — demo copy-paste (use in prompts for faster local runs)  ║
╚══════════════════════════════════════════════════════════════════════════╝

Doctor → Submit issuer / unified reg — license hash (or Enter for demo):
${DEMO_LICENSE_HASH}

Admin approve — doctor public key (this session’s doctor wallet):
${doctorCoinPublicKeyHex}

On-chain credential id demo (register/revoke):
${DEMO_CREDENTIAL_ID}

Patient request — optional label (Enter = demo):
${DEMO_PATIENT_LABEL}

Doctor fulfill — ICD-10 line (Enter = demo):
${DEMO_ICD10_LINE}

Trial — id / criteria (Enter defaults in Trial menu):
trialId=${DEMO_TRIAL_ID}
criteria=${DEMO_CRITERIA_HASH}

Contract address:
${contractAddressHex}

Verification API (admin approve, patient request, doctor fulfill):
${verificationApiUrl}
  Start: npm run dev -w zkclinic-verification-api

Happy path: Doctor (unified reg) → Admin (approve) → Patient (request) → Doctor (fulfill) → Trial (create → enroll → close)
`);
}
