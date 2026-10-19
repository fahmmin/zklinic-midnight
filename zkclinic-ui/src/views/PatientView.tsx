import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { decryptCredential, type HealthCredentialPayload, type PatientIntakeV1 } from "../credential";
import {
  getStoredCredentials,
  type StoredCredentialMeta
} from "../credentialStorage";
import { PatientHistoryCard } from "../components/patient/PatientHistoryCard";
import { formatShortId } from "../components/patient/patientCardUtils";
import { DEMO_PATIENT_ASSIST_PROMPT } from "../lib/demoWorkspaceMocks";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { ui } from "../ui";
import { TrialBrowseView } from "./TrialBrowseView";

const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

type ConditionRow = { label: string; icd10: string; approxOnset: string; notes: string };

/** Demo values so "Create request code" works immediately; replace with your own data anytime. */
const DEMO_CHIEF_COMPLAINT =
  "Follow-up for blood sugar and blood pressure; routine diabetes and hypertension care.";
const DEMO_NARRATIVE =
  "Type 2 diabetes since 2019; hypertension diagnosed 2020. No hospitalizations this year. Walks daily.";
const DEMO_CONDITION_ROWS: ConditionRow[] = [
  { label: "Type 2 diabetes mellitus", icd10: "E11.9", approxOnset: "2019", notes: "Well controlled on oral meds" },
  { label: "Essential (primary) hypertension", icd10: "I10", approxOnset: "2020", notes: "Home BP logs attached when available" }
];
const DEMO_MEDICATIONS = "Metformin 500 mg twice daily\nLisinopril 10 mg once daily";
const DEMO_MED_ALLERGIES = "Penicillin (rash)";
const DEMO_ALLERGIES = "Shellfish";
const DEMO_ENV_ALLERGENS = "Pollen (seasonal)";
const DEMO_PMH = "Hyperlipidemia — diet controlled.";
const DEMO_SURGICAL = "Appendectomy (childhood).";
const DEMO_HOSP = "None recent.";
const DEMO_FAMILY = "Father: MI at 62. Mother: type 2 diabetes.";
const DEMO_IMMUNIZATIONS = "Influenza yearly; COVID primary series.";
const DEMO_SOCIAL = "Non-smoker; occasional alcohol.";
const DEMO_OCC = "Office work; no industrial exposures.";
const DEMO_SYMPTOMS = "Occasional mild fatigue, no chest pain";

function conditionRowDedupeKey(r: ConditionRow): string | null {
  const C = r.icd10.trim().toUpperCase();
  const L = r.label.trim().toLowerCase();
  if (C) return `icd:${C}`;
  if (L) return `lbl:${L}`;
  return null;
}

function mergeConditionRows(existing: ConditionRow[], incoming: ConditionRow[]): ConditionRow[] {
  const keys = new Set(
    existing.map(conditionRowDedupeKey).filter((k): k is string => k != null)
  );
  const out = [...existing];
  for (const r of incoming) {
    const k = conditionRowDedupeKey(r);
    if (k && keys.has(k)) continue;
    if (k) keys.add(k);
    out.push(r);
  }
  return out.length ? out : [{ label: "", icd10: "", approxOnset: "", notes: "" }];
}

function mergeTextBlocks(current: string, addition: string): string {
  const a = addition.trim();
  if (!a) return current;
  const c = current.trim();
  if (!c) return a;
  if (c.includes(a)) return c;
  return `${c}\n\n${a}`;
}

function mergeListBlock(current: string, items: string[]): string {
  if (!items.length) return current;
  return mergeTextBlocks(current, items.join("\n"));
}

function scrollToPatientSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PatientSectionLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <a
      href={`#${id}`}
      className="zk-patient-sidebar__link"
      onClick={(e) => {
        e.preventDefault();
        scrollToPatientSection(id);
      }}
    >
      {children}
    </a>
  );
}

function intakeRowsFromPatientIntake(pi: PatientIntakeV1): ConditionRow[] {
  return (pi.conditions ?? [])
    .filter((c): c is Record<string, unknown> => c != null && typeof c === "object")
    .map((c) => {
      let notes = typeof c.notes === "string" ? c.notes : "";
      const i11 = typeof c.icd11 === "string" ? c.icd11.trim() : "";
      if (i11 && !notes.toLowerCase().includes(i11.toLowerCase())) {
        notes = notes ? `${notes} (ICD-11: ${i11})` : `ICD-11: ${i11}`;
      }
      return {
        label: typeof c.label === "string" ? c.label : "",
        icd10: typeof c.icd10 === "string" ? c.icd10 : "",
        approxOnset:
          typeof c.approxOnset === "string"
            ? c.approxOnset
            : typeof c.approxWhen === "string"
              ? c.approxWhen
              : "",
        notes
      };
    });
}

function rowsFromAttestedCodes(payload: HealthCredentialPayload): ConditionRow[] {
  const idShort = formatShortId(payload.credentialId);
  return (payload.icd10Codes ?? []).map((code) => ({
    label: "Clinician-attested diagnosis",
    icd10: code,
    approxOnset: "",
    notes: `From prior card ${idShort}`
  }));
}

function buildPatientIntake(fields: {
  chiefComplaint: string;
  narrative: string;
  conditionRows: ConditionRow[];
  medicationsBlock: string;
  medicationAllergiesBlock: string;
  allergiesBlock: string;
  environmentalAllergensBlock: string;
  pastMedicalHistory: string;
  surgicalHistory: string;
  hospitalizations: string;
  familyHistory: string;
  immunizations: string;
  socialHistory: string;
  occupationalExposure: string;
  currentSymptomsBlock: string;
}): PatientIntakeV1 | undefined {
  const intake: PatientIntakeV1 = {};
  if (fields.chiefComplaint.trim()) intake.chiefComplaint = fields.chiefComplaint.trim();
  if (fields.narrative.trim()) intake.narrative = fields.narrative.trim();
  const conds = fields.conditionRows
    .map((r) => ({
      label: r.label.trim() || undefined,
      icd10: r.icd10.trim() || undefined,
      approxOnset: r.approxOnset.trim() || undefined,
      notes: r.notes.trim() || undefined
    }))
    .filter((c) => c.label || c.icd10 || c.notes || c.approxOnset);
  if (conds.length) intake.conditions = conds;
  const splitList = (s: string) =>
    s
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  const meds = splitList(fields.medicationsBlock);
  if (meds.length) intake.medicationsList = meds;
  const ma = splitList(fields.medicationAllergiesBlock);
  if (ma.length) intake.medicationAllergies = ma;
  const al = splitList(fields.allergiesBlock);
  if (al.length) intake.allergies = al;
  const env = splitList(fields.environmentalAllergensBlock);
  if (env.length) intake.environmentalAllergens = env;
  if (fields.pastMedicalHistory.trim()) intake.pastMedicalHistory = fields.pastMedicalHistory.trim();
  if (fields.surgicalHistory.trim()) intake.surgicalHistory = fields.surgicalHistory.trim();
  if (fields.hospitalizations.trim()) intake.hospitalizations = fields.hospitalizations.trim();
  if (fields.familyHistory.trim()) intake.familyHistory = fields.familyHistory.trim();
  if (fields.immunizations.trim()) intake.immunizations = fields.immunizations.trim();
  if (fields.socialHistory.trim()) intake.socialHistory = fields.socialHistory.trim();
  if (fields.occupationalExposure.trim()) intake.occupationalExposure = fields.occupationalExposure.trim();
  const sym = splitList(fields.currentSymptomsBlock);
  if (sym.length) intake.currentSymptoms = sym;
  if (Object.keys(intake).length === 0) return undefined;
  return intake;
}

export function PatientView() {
  const {
    createCredentialRequest,
    fetchAndStoreCredential,
    refreshState,
    state,
    flowMessage,
    status
  } = useZKClinic();

  const [requestCode, setRequestCode] = useState("");
  const [fetchCode, setFetchCode] = useState("");
  const [stored, setStored] = useState<StoredCredentialMeta[]>([]);
  const [revokedAmongStored, setRevokedAmongStored] = useState<string[]>([]);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [proofRefreshKey, setProofRefreshKey] = useState(0);

  const [chiefComplaint, setChiefComplaint] = useState(DEMO_CHIEF_COMPLAINT);
  const [narrative, setNarrative] = useState(DEMO_NARRATIVE);
  const [conditionRows, setConditionRows] = useState<ConditionRow[]>(DEMO_CONDITION_ROWS);
  const [medicationsBlock, setMedicationsBlock] = useState(DEMO_MEDICATIONS);
  const [medicationAllergiesBlock, setMedicationAllergiesBlock] = useState(DEMO_MED_ALLERGIES);
  const [allergiesBlock, setAllergiesBlock] = useState(DEMO_ALLERGIES);
  const [environmentalAllergensBlock, setEnvironmentalAllergensBlock] = useState(DEMO_ENV_ALLERGENS);
  const [pastMedicalHistory, setPastMedicalHistory] = useState(DEMO_PMH);
  const [surgicalHistory, setSurgicalHistory] = useState(DEMO_SURGICAL);
  const [hospitalizations, setHospitalizations] = useState(DEMO_HOSP);
  const [familyHistory, setFamilyHistory] = useState(DEMO_FAMILY);
  const [immunizations, setImmunizations] = useState(DEMO_IMMUNIZATIONS);
  const [socialHistory, setSocialHistory] = useState(DEMO_SOCIAL);
  const [occupationalExposure, setOccupationalExposure] = useState(DEMO_OCC);
  const [currentSymptomsBlock, setCurrentSymptomsBlock] = useState(DEMO_SYMPTOMS);
  const [assistPrompt, setAssistPrompt] = useState(DEMO_PATIENT_ASSIST_PROMPT);
  const [assistBusy, setAssistBusy] = useState(false);
  const [mergeSourceCredentialId, setMergeSourceCredentialId] = useState("");
  const [mergeBusy, setMergeBusy] = useState(false);
  const [continueExistingCard, setContinueExistingCard] = useState(false);

  const contractConnected = status === "deployed";

  const reloadStored = useCallback(() => {
    setStored(getStoredCredentials());
  }, []);

  useEffect(() => {
    reloadStored();
  }, [createdCode, fetchCode, reloadStored]);

  useEffect(() => {
    if (!state?.revokedCredentialIds?.length) {
      setRevokedAmongStored([]);
      return;
    }
    const ids = new Set(state.revokedCredentialIds.map((x) => x.toLowerCase()));
    const revoked = stored
      .filter((c) => ids.has(c.credentialId.toLowerCase()))
      .map((c) => c.credentialId);
    setRevokedAmongStored(revoked);
  }, [state?.revokedCredentialIds, stored]);

  useEffect(() => {
    if (stored.length === 0) {
      setSelectedCardId("");
      return;
    }
    if (!selectedCardId || !stored.some((c) => c.credentialId === selectedCardId)) {
      setSelectedCardId(stored[0]!.credentialId);
    }
  }, [stored, selectedCardId]);

  useEffect(() => {
    if (stored.length === 0) {
      setContinueExistingCard(false);
    }
  }, [stored.length]);

  useEffect(() => {
    if (stored.length === 0) {
      setMergeSourceCredentialId("");
      return;
    }
    if (
      !mergeSourceCredentialId ||
      !stored.some((c) => c.credentialId === mergeSourceCredentialId)
    ) {
      setMergeSourceCredentialId(stored[0]!.credentialId);
    }
  }, [stored, mergeSourceCredentialId]);

  const handleProofCreated = useCallback(() => {
    setProofRefreshKey((k) => k + 1);
  }, []);

  const applyAssistantIntake = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const pi = raw as Record<string, unknown>;
    if (typeof pi.chiefComplaint === "string") setChiefComplaint(pi.chiefComplaint);
    if (typeof pi.narrative === "string") setNarrative(pi.narrative);
    if (Array.isArray(pi.medicationsList)) {
      setMedicationsBlock(pi.medicationsList.filter((x) => typeof x === "string").join("\n"));
    }
    if (Array.isArray(pi.medicationAllergies)) {
      setMedicationAllergiesBlock(pi.medicationAllergies.filter((x) => typeof x === "string").join("\n"));
    }
    if (Array.isArray(pi.allergies)) {
      setAllergiesBlock(pi.allergies.filter((x) => typeof x === "string").join("\n"));
    }
    if (Array.isArray(pi.environmentalAllergens)) {
      setEnvironmentalAllergensBlock(pi.environmentalAllergens.filter((x) => typeof x === "string").join("\n"));
    }
    if (typeof pi.pastMedicalHistory === "string") setPastMedicalHistory(pi.pastMedicalHistory);
    if (typeof pi.surgicalHistory === "string") setSurgicalHistory(pi.surgicalHistory);
    if (typeof pi.hospitalizations === "string") setHospitalizations(pi.hospitalizations);
    if (typeof pi.familyHistory === "string") setFamilyHistory(pi.familyHistory);
    if (typeof pi.immunizations === "string") setImmunizations(pi.immunizations);
    if (typeof pi.socialHistory === "string") setSocialHistory(pi.socialHistory);
    if (typeof pi.occupationalExposure === "string") setOccupationalExposure(pi.occupationalExposure);
    if (Array.isArray(pi.currentSymptoms)) {
      setCurrentSymptomsBlock(pi.currentSymptoms.filter((x) => typeof x === "string").join(", "));
    }
    if (Array.isArray(pi.conditions)) {
      const rows: ConditionRow[] = pi.conditions
        .filter((c): c is Record<string, unknown> => c != null && typeof c === "object")
        .map((c) => ({
          label: typeof c.label === "string" ? c.label : "",
          icd10: typeof c.icd10 === "string" ? c.icd10 : "",
          approxOnset:
            typeof c.approxOnset === "string"
              ? c.approxOnset
              : typeof c.approxWhen === "string"
                ? c.approxWhen
                : "",
          notes: typeof c.notes === "string" ? c.notes : ""
        }));
      if (rows.length) setConditionRows(rows);
    }
  }, []);

  const handleMergeFromStoredCard = useCallback(async () => {
    const meta = stored.find((c) => c.credentialId === mergeSourceCredentialId);
    if (!meta) {
      setError("Select a stored card to merge from.");
      return;
    }
    setError(null);
    setMergeBusy(true);
    try {
      const payload = await decryptCredential(
        meta.encryptedCredential,
        meta.requestCode,
        meta.credentialId
      );
      const intake = payload.patientIntake;

      if (intake?.chiefComplaint) {
        setChiefComplaint((c) => mergeTextBlocks(c, intake.chiefComplaint!));
      }
      if (intake?.narrative) {
        setNarrative((c) => mergeTextBlocks(c, intake.narrative!));
      }

      setConditionRows((rows) => {
        let next = rows;
        if (intake) next = mergeConditionRows(next, intakeRowsFromPatientIntake(intake));
        next = mergeConditionRows(next, rowsFromAttestedCodes(payload));
        return next;
      });

      setMedicationsBlock((b) => {
        let n = b;
        if (intake?.medicationsList?.length) n = mergeListBlock(n, intake.medicationsList!);
        n = mergeListBlock(n, payload.medications ?? []);
        return n;
      });

      if (intake?.medicationAllergies?.length) {
        setMedicationAllergiesBlock((b) => mergeListBlock(b, intake.medicationAllergies!));
      }
      if (intake?.allergies?.length) {
        setAllergiesBlock((b) => mergeListBlock(b, intake.allergies!));
      }
      if (intake?.environmentalAllergens?.length) {
        setEnvironmentalAllergensBlock((b) => mergeListBlock(b, intake.environmentalAllergens!));
      }
      if (intake?.pastMedicalHistory) {
        setPastMedicalHistory((x) => mergeTextBlocks(x, intake.pastMedicalHistory!));
      }
      if (intake?.surgicalHistory) {
        setSurgicalHistory((x) => mergeTextBlocks(x, intake.surgicalHistory!));
      }
      if (intake?.hospitalizations) {
        setHospitalizations((x) => mergeTextBlocks(x, intake.hospitalizations!));
      }
      if (intake?.familyHistory) {
        setFamilyHistory((x) => mergeTextBlocks(x, intake.familyHistory!));
      }
      if (intake?.immunizations) {
        setImmunizations((x) => mergeTextBlocks(x, intake.immunizations!));
      }
      if (intake?.socialHistory) {
        setSocialHistory((x) => mergeTextBlocks(x, intake.socialHistory!));
      }
      if (intake?.occupationalExposure) {
        setOccupationalExposure((x) => mergeTextBlocks(x, intake.occupationalExposure!));
      }
      if (intake?.currentSymptoms?.length) {
        setCurrentSymptomsBlock((x) => mergeTextBlocks(x, intake.currentSymptoms!.join(", ")));
      }
    } catch (e) {
      setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    } finally {
      setMergeBusy(false);
    }
  }, [stored, mergeSourceCredentialId]);

  const handleAssistantFill = async () => {
    if (!assistPrompt.trim()) {
      setError("Enter a short description of your health situation for the assistant.");
      return;
    }
    setError(null);
    setAssistBusy(true);
    try {
      const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/assistant/fill-patient-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: assistPrompt.trim() })
      });
      const j = (await res.json()) as { patientIntake?: unknown; error?: string };
      if (!res.ok) throw new Error(j.error ?? `Assistant failed (${res.status})`);
      applyAssistantIntake(j.patientIntake);
    } catch (e) {
      setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    } finally {
      setAssistBusy(false);
    }
  };

  const handleCreateRequest = async () => {
    setError(null);
    try {
      const intake = buildPatientIntake({
        chiefComplaint,
        narrative,
        conditionRows,
        medicationsBlock,
        medicationAllergiesBlock,
        allergiesBlock,
        environmentalAllergensBlock,
        pastMedicalHistory,
        surgicalHistory,
        hospitalizations,
        familyHistory,
        immunizations,
        socialHistory,
        occupationalExposure,
        currentSymptomsBlock
      });
      const continuingHex =
        continueExistingCard && selectedCardId.trim()
          ? selectedCardId.trim().replace(/^0x/i, "").toLowerCase()
          : undefined;
      const { requestCode: code } = await createCredentialRequest(undefined, intake, continuingHex);
      setCreatedCode(code);
    } catch (e) {
      setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    }
  };

  const handleFetchCredential = async () => {
    if (!fetchCode.trim()) {
      setError("Enter the request code your doctor gave you.");
      return;
    }
    setError(null);
    try {
      await fetchAndStoreCredential(fetchCode.trim());
      reloadStored();
      setFetchCode("");
    } catch (e) {
      setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <section className={ui.section} data-testid="patient-view">
      <div className={ui.sectionInner}>
        <div className="zk-patient-layout">
          <aside className="zk-patient-sidebar" aria-label="Sections on this page">
            <p className="zk-patient-sidebar__title">On this page</p>
            <nav className="zk-patient-sidebar__nav">
              <PatientSectionLink id="patient-overview">Overview</PatientSectionLink>
              <PatientSectionLink id="patient-cards">Cards on this device</PatientSectionLink>
              <PatientSectionLink id="patient-obtain">Obtain your card</PatientSectionLink>
              <PatientSectionLink id="patient-health">Health details</PatientSectionLink>
              <PatientSectionLink id="patient-step-1">Step 1 · Request code</PatientSectionLink>
              <PatientSectionLink id="patient-step-2">Step 2 · Fetch card</PatientSectionLink>
              <PatientSectionLink id="patient-trials">Trial matching</PatientSectionLink>
            </nav>
          </aside>
          <div className="zk-patient-main">
            <div data-testid="patient-gate" className="zk-patient-gate">
              <div className="zk-patient-gate__hero">
                <div id="patient-overview" className="zk-patient-anchor">
                  <p className={ui.sectionTitle}>Patient · centerpiece</p>
                  <h2 className={ui.h2}>Your lifetime health card — the anchor for matching</h2>
                  <p className={ui.lead} style={{ maxWidth: "56ch" }}>
                    ZKClinic is built around a <strong>doctor-backed health card</strong> on your device. For follow-up
                    with the <strong>same</strong> clinician, check <strong>Continue selected health card</strong> when
                    you create a request — the on-chain id stays fixed and each visit adds a signed diagnosis entry. You
                    can still <strong>merge older text</strong> into the form for context. Use the card for{" "}
                    <strong>trial matching</strong> without exposing your full record.
                  </p>
                </div>
                <div id="patient-cards" className="zk-patient-hero-cards" data-testid="patient-hero-cards">
                  <p className={ui.sectionTitle}>Your health card</p>
                  <h3 className={ui.h2}>Cards on this device</h3>
                  {stored.length === 0 ? (
                    <div data-testid="patient-no-credentials">
                      <p className={ui.lead}>No card yet — create a request and fetch after your doctor signs.</p>
                      <p className={ui.msgMuted}>Nothing leaves this browser until you choose to run a trial check.</p>
                    </div>
                  ) : (
                    <div className="zk-health-card-grid" data-testid="patient-credential-list">
                      {stored.map((c) => (
                        <PatientHistoryCard
                          key={c.credentialId}
                          meta={c}
                          revoked={revokedAmongStored.includes(c.credentialId)}
                          selected={c.credentialId === selectedCardId}
                          onSelect={() => setSelectedCardId(c.credentialId)}
                          proofRefreshKey={proofRefreshKey}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div id="patient-obtain" className="zk-patient-anchor">
              <p className={ui.sectionTitle}>Obtain your card</p>
        <h2 className={ui.h2}>Request & store your card</h2>
        <p className={ui.lead}>
          Create a code for your doctor. After delivery, fetch here — continuing the same card updates the stored
          ciphertext in place. Or start a <strong>new</strong> card (leave the checkbox off). You can also{" "}
          <strong>merge an older card into the form</strong> for free-text history. Data stays local until you prove
          eligibility.
        </p>

        {!contractConnected && (
          <div className={ui.warningPanel} data-testid="patient-no-contract-banner" style={{ marginBottom: "1rem" }}>
            <p style={{ fontWeight: 700, marginBottom: "0.35rem" }}>Trial browse needs the contract</p>
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>
              Request codes and fetching credentials work with the verification API alone. To browse trials and refresh
              revocation from the chain, join a contract on <strong>Registry</strong> first.
            </p>
          </div>
        )}

        {flowMessage && (
          <p className={ui.msgFlow} data-testid="patient-flow">
            {flowMessage}
          </p>
        )}
        {error && (
          <p className={ui.msgError} data-testid="patient-error" role="alert">
            {error}
          </p>
        )}
            </div>

            <div className={ui.divider} />

            <div id="patient-health" className="zk-patient-anchor">
              <p className={ui.sectionTitle}>Health details (optional, private)</p>
        <h3 className={ui.h2}>What goes on your card with the doctor&apos;s signature</h3>
        <p className={ui.lead} style={{ maxWidth: "60ch" }}>
          This stays off-chain: it is bundled into the encrypted payload your doctor delivers. Condition names you type
          are <strong>not</strong> auto-mapped to ICD codes — you may enter optional ICD-10 hints, use the assistant
          (may suggest codes when clearly inferable), and your doctor records authoritative ICD-10/ICD-11 codes when
          they sign. Those codes are merged with your intake on the card.
        </p>

        {stored.length > 0 && (
          <div
            className={ui.highlight}
            style={{ marginBottom: "1rem", maxWidth: "42rem" }}
            data-testid="patient-merge-from-card"
          >
            <p className={ui.highlightLabel}>Follow-up visit — merge prior card</p>
            <p className={ui.msgMuted} style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
              Append encrypted details from a card already on this device into the form (deduplicated by diagnosis
              code). Add new rows or text for today, then create a new request — the clinician&apos;s new codes will
              merge into the next credential too.
            </p>
            <div className={ui.inputRow} style={{ flexWrap: "wrap", gap: "0.5rem" }}>
              <select
                className={ui.input}
                style={{ minWidth: "12rem", flex: "1 1 12rem" }}
                value={mergeSourceCredentialId}
                onChange={(e) => setMergeSourceCredentialId(e.target.value)}
                aria-label="Stored card to merge from"
              >
                {stored.map((c) => (
                  <option key={c.credentialId} value={c.credentialId}>
                    {formatShortId(c.credentialId)} · {new Date(c.fetchedAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={ui.btn}
                data-testid="btn-merge-stored-card"
                disabled={mergeBusy || !mergeSourceCredentialId}
                onClick={() => void handleMergeFromStoredCard()}
              >
                {mergeBusy ? "Merging…" : "Merge into form →"}
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <p className={ui.msgMuted} style={{ marginBottom: "0.35rem" }}>
            Describe in your own words — optional Gemini assist on the verification API (
            <code className={ui.code}>GEMINI_API_KEY</code>).
          </p>
          <textarea
            className={`${ui.input} zk-patient-meds`}
            rows={3}
            placeholder="e.g. Type 2 diabetes diagnosed 2019, on metformin; penicillin allergy; former smoker…"
            value={assistPrompt}
            onChange={(e) => setAssistPrompt(e.target.value)}
            data-testid="patient-assist-prompt"
          />
          <button
            type="button"
            className={ui.btn}
            style={{ marginTop: "0.5rem" }}
            data-testid="btn-patient-assist"
            onClick={() => void handleAssistantFill()}
            disabled={assistBusy}
          >
            {assistBusy ? "Filling…" : "Autofill form from description →"}
          </button>
        </div>

        <div className={ui.stackSm} style={{ maxWidth: "40rem" }}>
          <label className={ui.msgMuted}>
            Chief complaint (main reason for this visit, in your own words)
            <input
              className={ui.input}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              placeholder="e.g. Worsening headaches this week"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Narrative / story
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={3}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              placeholder="Timeline, context, what you have already tried…"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </label>
          <p className={ui.sectionTitle} style={{ marginTop: "0.5rem" }}>
            Conditions (add rows)
          </p>
          {conditionRows.map((row, i) => (
            <div key={i} className={ui.inputRow} style={{ flexWrap: "wrap", gap: "0.35rem" }}>
              <input
                className={ui.input}
                placeholder="Condition name"
                value={row.label}
                onChange={(e) => {
                  const next = [...conditionRows];
                  next[i] = { ...row, label: e.target.value };
                  setConditionRows(next);
                }}
              />
              <input
                className={ui.input}
                placeholder="ICD-10 (optional)"
                value={row.icd10}
                onChange={(e) => {
                  const next = [...conditionRows];
                  next[i] = { ...row, icd10: e.target.value };
                  setConditionRows(next);
                }}
              />
              <input
                className={ui.input}
                placeholder="When (e.g. 2019)"
                value={row.approxOnset}
                onChange={(e) => {
                  const next = [...conditionRows];
                  next[i] = { ...row, approxOnset: e.target.value };
                  setConditionRows(next);
                }}
              />
              <input
                className={ui.input}
                placeholder="Notes"
                value={row.notes}
                onChange={(e) => {
                  const next = [...conditionRows];
                  next[i] = { ...row, notes: e.target.value };
                  setConditionRows(next);
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className={ui.btn}
            onClick={() => setConditionRows([...conditionRows, { label: "", icd10: "", approxOnset: "", notes: "" }])}
          >
            + Condition row
          </button>

          <label className={ui.msgMuted}>
            Medications (lines or commas)
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={3}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={medicationsBlock}
              onChange={(e) => setMedicationsBlock(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Drug allergies
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={medicationAllergiesBlock}
              onChange={(e) => setMedicationAllergiesBlock(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Other allergies
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={allergiesBlock}
              onChange={(e) => setAllergiesBlock(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Environmental / food allergens
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={environmentalAllergensBlock}
              onChange={(e) => setEnvironmentalAllergensBlock(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Past medical history
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={pastMedicalHistory}
              onChange={(e) => setPastMedicalHistory(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Surgical history
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={surgicalHistory}
              onChange={(e) => setSurgicalHistory(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Hospitalizations
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={hospitalizations}
              onChange={(e) => setHospitalizations(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Family history
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={familyHistory}
              onChange={(e) => setFamilyHistory(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Immunizations
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={immunizations}
              onChange={(e) => setImmunizations(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Social history
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={socialHistory}
              onChange={(e) => setSocialHistory(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Occupational / exposure
            <textarea
              className={`${ui.input} zk-patient-meds`}
              rows={2}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={occupationalExposure}
              onChange={(e) => setOccupationalExposure(e.target.value)}
            />
          </label>
          <label className={ui.msgMuted}>
            Current symptoms (comma-separated)
            <input
              className={ui.input}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={currentSymptomsBlock}
              onChange={(e) => setCurrentSymptomsBlock(e.target.value)}
            />
          </label>
        </div>

            </div>

            <div className={ui.divider} />

            <div id="patient-step-1" className="zk-patient-anchor">
              <p className={ui.sectionTitle}>Step 1</p>
              <h3 className={ui.h2}>Create a request</h3>
        {stored.length > 0 && (
          <label
            className={ui.msgMuted}
            style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.75rem", maxWidth: "48ch" }}
          >
            <input
              type="checkbox"
              checked={continueExistingCard}
              onChange={(e) => setContinueExistingCard(e.target.checked)}
              data-testid="patient-continue-card-checkbox"
            />
            <span>
              <strong>Continue selected health card</strong> — same on-chain credential id; your doctor appends this
              visit&apos;s diagnosis to that card (you must use the same doctor who issued it). Card:{" "}
              <code className={ui.code}>{formatShortId(selectedCardId)}</code>
            </span>
          </label>
        )}
        <button
          type="button"
          className={ui.btnPrimary}
          data-testid="btn-create-request"
          onClick={handleCreateRequest}
        >
          Create request code
        </button>
        {createdCode && (
          <div className={ui.highlight} data-testid="patient-request-code-box">
            <p className={ui.highlightLabel}>Share with your doctor</p>
            <div className={ui.codeBig} data-testid="patient-request-code">
              {createdCode}
            </div>
          </div>
        )}

            </div>

            <div className={ui.divider} />

            <div id="patient-step-2" className="zk-patient-anchor">
              <p className={ui.sectionTitle}>Step 2</p>
              <h3 className={ui.h2}>Fetch when ready</h3>
        <p className={ui.msgMuted} style={{ marginBottom: "0.5rem" }}>
          Re-enter the same request code you created in Step 1 — your doctor used it to deliver the signed credential.
        </p>
        <div className={ui.inputRow}>
          <input
            className={ui.input}
            placeholder="Your request code (e.g. ABC12XY9)"
            value={fetchCode}
            onChange={(e) => setFetchCode(e.target.value.toUpperCase())}
            data-testid="input-fetch-code"
          />
          <button
            type="button"
            className={ui.btnPrimary}
            data-testid="btn-fetch-credential"
            onClick={handleFetchCredential}
            disabled={!fetchCode.trim()}
          >
            Fetch & store
          </button>
        </div>

        {contractConnected && state && (
          <button
            type="button"
            className={ui.btn}
            style={{ marginTop: "0.75rem" }}
            data-testid="btn-refresh-revocation"
            onClick={refreshState}
          >
            Refresh revocation status →
          </button>
        )}

        {revokedAmongStored.length > 0 && (
          <div className={ui.warningPanel} data-testid="patient-revoked-banner" style={{ marginTop: "1rem" }}>
            <p style={{ fontWeight: 700, marginBottom: "0.35rem" }}>Revoked on-chain</p>
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>
              Your doctor revoked these credentials. They won’t be accepted for new proofs.
            </p>
            <ul className={ui.list}>
              {revokedAmongStored.map((id) => (
                <li key={id}>
                  <code className={ui.code}>{id.slice(0, 16)}…</code>
                </li>
              ))}
            </ul>
          </div>
        )}

            </div>

            <div id="patient-trials" className="zk-patient-anchor">
              <TrialBrowseView
                storedCredentials={stored}
                selectedCredentialId={selectedCardId}
                onCredentialChange={setSelectedCardId}
                onProofCreated={handleProofCreated}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
