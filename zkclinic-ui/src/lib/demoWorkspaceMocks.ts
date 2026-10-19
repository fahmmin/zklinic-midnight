/**
 * Dev/demo defaults for staff workspaces — plausible shapes for forms and verification API.
 * NMC live lookup may still fail for synthetic IDs; fields match OCR / IMR extractors in the UI.
 */

/**
 * 64-hex license hash for manual issuer submit (demo only).
 * Same digest as CLI `DEMO_LICENSE_HASH` — SHA-256("zkclinic-demo-license-v1") in hex.
 */
export const DEMO_LICENSE_HASH_64 =
  "a027873ccf91b623cbe3c3be6dfb0bf1262a5be20dff796a45413c5d00b29a45";

/** India NMC-style identifiers (demo). Certificate text below is aligned with extractNmcHintsFromText. */
export const DEMO_NMC_DOCTOR_ID = "6085963";
export const DEMO_NMC_REGISTRATION_NO = "DL45218";
export const DEMO_OCR_NAME_HINT = "Ananya Sharma";
export const DEMO_OCR_SMC_HINT = "Delhi Medical Council";

export const DEMO_IMR_RECORD_TEXT = `Indian Medical Register — excerpt (demo)
Doctor ID: 6085963
Registration No: DL45218
Name: Dr. Ananya Sharma
Qualification: MBBS, MD (Internal Medicine)
State Medical Council: Delhi Medical Council
Year of registration: 2018
Status: Active`;

export const DEMO_CERTIFICATE_OCR_TEXT = `National Medical Commission — Registration Certificate (demo)
Doctor ID: 6085963
Name: Dr. Ananya Sharma
Reg. No.: DL45218
State Medical Council: Delhi Medical Council
This document is for ZKClinic UI testing only.`;

export const DEMO_DOCTOR_MEDICATIONS_BLOCK = `Metformin 500 mg PO BID
Lisinopril 10 mg PO daily
Atorvastatin 20 mg PO QHS`;

/** ICD-10 codes for doctor signing demo (aligned with patient demo card). */
export const DEMO_DOCTOR_ICD10_CODES = ["E11.9", "I10"] as const;

export const DEMO_PATIENT_ASSIST_PROMPT =
  "Type 2 diabetes since 2019 on metformin; hypertension; penicillin allergy; non-smoker.";

export const DEMO_TRIAL_TITLE = "T2DM adjunct therapy — phase 2 (demo)";
export const DEMO_TRIAL_SHORT_DESCRIPTION =
  "Recruiting people with type 2 diabetes on metformin; excludes active malignancy and anticoagulants.";
export const DEMO_TRIAL_INCLUSION_ICD10 = ["E11.9"] as const;
export const DEMO_TRIAL_EXCLUSION_ICD10 = ["C80"] as const;
export const DEMO_TRIAL_EXCLUSION_MEDS = "warfarin, clopidogrel";
export const DEMO_TRIAL_ASSIST_PROMPT =
  "Phase 2 diabetes trial: inclusion type 2 diabetes E11.9; exclude active cancer and anticoagulants.";

export const DEMO_TRIAL_BROWSE_SEARCH = "diabetes";

/** Default datetime-local for trial deadline (~6 months). */
export function demoTrialDeadlineLocal(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
