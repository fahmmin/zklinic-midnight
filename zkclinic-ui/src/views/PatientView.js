import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { decryptCredential } from "../credential";
import { getStoredCredentials } from "../credentialStorage";
import { PatientHistoryCard } from "../components/patient/PatientHistoryCard";
import { formatShortId } from "../components/patient/patientCardUtils";
import { DEMO_PATIENT_ASSIST_PROMPT } from "../lib/demoWorkspaceMocks";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { ui } from "../ui";
import { TrialBrowseView } from "./TrialBrowseView";
const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";
/** Demo values so "Create request code" works immediately; replace with your own data anytime. */
const DEMO_CHIEF_COMPLAINT = "Follow-up for blood sugar and blood pressure; routine diabetes and hypertension care.";
const DEMO_NARRATIVE = "Type 2 diabetes since 2019; hypertension diagnosed 2020. No hospitalizations this year. Walks daily.";
const DEMO_CONDITION_ROWS = [
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
function conditionRowDedupeKey(r) {
    const C = r.icd10.trim().toUpperCase();
    const L = r.label.trim().toLowerCase();
    if (C)
        return `icd:${C}`;
    if (L)
        return `lbl:${L}`;
    return null;
}
function mergeConditionRows(existing, incoming) {
    const keys = new Set(existing.map(conditionRowDedupeKey).filter((k) => k != null));
    const out = [...existing];
    for (const r of incoming) {
        const k = conditionRowDedupeKey(r);
        if (k && keys.has(k))
            continue;
        if (k)
            keys.add(k);
        out.push(r);
    }
    return out.length ? out : [{ label: "", icd10: "", approxOnset: "", notes: "" }];
}
function mergeTextBlocks(current, addition) {
    const a = addition.trim();
    if (!a)
        return current;
    const c = current.trim();
    if (!c)
        return a;
    if (c.includes(a))
        return c;
    return `${c}\n\n${a}`;
}
function mergeListBlock(current, items) {
    if (!items.length)
        return current;
    return mergeTextBlocks(current, items.join("\n"));
}
function scrollToPatientSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function PatientSectionLink({ id, children }) {
    return (_jsx("a", { href: `#${id}`, className: "zk-patient-sidebar__link", onClick: (e) => {
            e.preventDefault();
            scrollToPatientSection(id);
        }, children: children }));
}
function intakeRowsFromPatientIntake(pi) {
    return (pi.conditions ?? [])
        .filter((c) => c != null && typeof c === "object")
        .map((c) => {
        let notes = typeof c.notes === "string" ? c.notes : "";
        const i11 = typeof c.icd11 === "string" ? c.icd11.trim() : "";
        if (i11 && !notes.toLowerCase().includes(i11.toLowerCase())) {
            notes = notes ? `${notes} (ICD-11: ${i11})` : `ICD-11: ${i11}`;
        }
        return {
            label: typeof c.label === "string" ? c.label : "",
            icd10: typeof c.icd10 === "string" ? c.icd10 : "",
            approxOnset: typeof c.approxOnset === "string"
                ? c.approxOnset
                : typeof c.approxWhen === "string"
                    ? c.approxWhen
                    : "",
            notes
        };
    });
}
function rowsFromAttestedCodes(payload) {
    const idShort = formatShortId(payload.credentialId);
    return (payload.icd10Codes ?? []).map((code) => ({
        label: "Clinician-attested diagnosis",
        icd10: code,
        approxOnset: "",
        notes: `From prior card ${idShort}`
    }));
}
function buildPatientIntake(fields) {
    const intake = {};
    if (fields.chiefComplaint.trim())
        intake.chiefComplaint = fields.chiefComplaint.trim();
    if (fields.narrative.trim())
        intake.narrative = fields.narrative.trim();
    const conds = fields.conditionRows
        .map((r) => ({
        label: r.label.trim() || undefined,
        icd10: r.icd10.trim() || undefined,
        approxOnset: r.approxOnset.trim() || undefined,
        notes: r.notes.trim() || undefined
    }))
        .filter((c) => c.label || c.icd10 || c.notes || c.approxOnset);
    if (conds.length)
        intake.conditions = conds;
    const splitList = (s) => s
        .split(/[\n,]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    const meds = splitList(fields.medicationsBlock);
    if (meds.length)
        intake.medicationsList = meds;
    const ma = splitList(fields.medicationAllergiesBlock);
    if (ma.length)
        intake.medicationAllergies = ma;
    const al = splitList(fields.allergiesBlock);
    if (al.length)
        intake.allergies = al;
    const env = splitList(fields.environmentalAllergensBlock);
    if (env.length)
        intake.environmentalAllergens = env;
    if (fields.pastMedicalHistory.trim())
        intake.pastMedicalHistory = fields.pastMedicalHistory.trim();
    if (fields.surgicalHistory.trim())
        intake.surgicalHistory = fields.surgicalHistory.trim();
    if (fields.hospitalizations.trim())
        intake.hospitalizations = fields.hospitalizations.trim();
    if (fields.familyHistory.trim())
        intake.familyHistory = fields.familyHistory.trim();
    if (fields.immunizations.trim())
        intake.immunizations = fields.immunizations.trim();
    if (fields.socialHistory.trim())
        intake.socialHistory = fields.socialHistory.trim();
    if (fields.occupationalExposure.trim())
        intake.occupationalExposure = fields.occupationalExposure.trim();
    const sym = splitList(fields.currentSymptomsBlock);
    if (sym.length)
        intake.currentSymptoms = sym;
    if (Object.keys(intake).length === 0)
        return undefined;
    return intake;
}
export function PatientView() {
    const { createCredentialRequest, fetchAndStoreCredential, refreshState, state, flowMessage, status } = useZKClinic();
    const [requestCode, setRequestCode] = useState("");
    const [fetchCode, setFetchCode] = useState("");
    const [stored, setStored] = useState([]);
    const [revokedAmongStored, setRevokedAmongStored] = useState([]);
    const [createdCode, setCreatedCode] = useState(null);
    const [error, setError] = useState(null);
    const [selectedCardId, setSelectedCardId] = useState("");
    const [proofRefreshKey, setProofRefreshKey] = useState(0);
    const [chiefComplaint, setChiefComplaint] = useState(DEMO_CHIEF_COMPLAINT);
    const [narrative, setNarrative] = useState(DEMO_NARRATIVE);
    const [conditionRows, setConditionRows] = useState(DEMO_CONDITION_ROWS);
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
            setSelectedCardId(stored[0].credentialId);
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
        if (!mergeSourceCredentialId ||
            !stored.some((c) => c.credentialId === mergeSourceCredentialId)) {
            setMergeSourceCredentialId(stored[0].credentialId);
        }
    }, [stored, mergeSourceCredentialId]);
    const handleProofCreated = useCallback(() => {
        setProofRefreshKey((k) => k + 1);
    }, []);
    const applyAssistantIntake = useCallback((raw) => {
        if (!raw || typeof raw !== "object")
            return;
        const pi = raw;
        if (typeof pi.chiefComplaint === "string")
            setChiefComplaint(pi.chiefComplaint);
        if (typeof pi.narrative === "string")
            setNarrative(pi.narrative);
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
        if (typeof pi.pastMedicalHistory === "string")
            setPastMedicalHistory(pi.pastMedicalHistory);
        if (typeof pi.surgicalHistory === "string")
            setSurgicalHistory(pi.surgicalHistory);
        if (typeof pi.hospitalizations === "string")
            setHospitalizations(pi.hospitalizations);
        if (typeof pi.familyHistory === "string")
            setFamilyHistory(pi.familyHistory);
        if (typeof pi.immunizations === "string")
            setImmunizations(pi.immunizations);
        if (typeof pi.socialHistory === "string")
            setSocialHistory(pi.socialHistory);
        if (typeof pi.occupationalExposure === "string")
            setOccupationalExposure(pi.occupationalExposure);
        if (Array.isArray(pi.currentSymptoms)) {
            setCurrentSymptomsBlock(pi.currentSymptoms.filter((x) => typeof x === "string").join(", "));
        }
        if (Array.isArray(pi.conditions)) {
            const rows = pi.conditions
                .filter((c) => c != null && typeof c === "object")
                .map((c) => ({
                label: typeof c.label === "string" ? c.label : "",
                icd10: typeof c.icd10 === "string" ? c.icd10 : "",
                approxOnset: typeof c.approxOnset === "string"
                    ? c.approxOnset
                    : typeof c.approxWhen === "string"
                        ? c.approxWhen
                        : "",
                notes: typeof c.notes === "string" ? c.notes : ""
            }));
            if (rows.length)
                setConditionRows(rows);
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
            const payload = await decryptCredential(meta.encryptedCredential, meta.requestCode, meta.credentialId);
            const intake = payload.patientIntake;
            if (intake?.chiefComplaint) {
                setChiefComplaint((c) => mergeTextBlocks(c, intake.chiefComplaint));
            }
            if (intake?.narrative) {
                setNarrative((c) => mergeTextBlocks(c, intake.narrative));
            }
            setConditionRows((rows) => {
                let next = rows;
                if (intake)
                    next = mergeConditionRows(next, intakeRowsFromPatientIntake(intake));
                next = mergeConditionRows(next, rowsFromAttestedCodes(payload));
                return next;
            });
            setMedicationsBlock((b) => {
                let n = b;
                if (intake?.medicationsList?.length)
                    n = mergeListBlock(n, intake.medicationsList);
                n = mergeListBlock(n, payload.medications ?? []);
                return n;
            });
            if (intake?.medicationAllergies?.length) {
                setMedicationAllergiesBlock((b) => mergeListBlock(b, intake.medicationAllergies));
            }
            if (intake?.allergies?.length) {
                setAllergiesBlock((b) => mergeListBlock(b, intake.allergies));
            }
            if (intake?.environmentalAllergens?.length) {
                setEnvironmentalAllergensBlock((b) => mergeListBlock(b, intake.environmentalAllergens));
            }
            if (intake?.pastMedicalHistory) {
                setPastMedicalHistory((x) => mergeTextBlocks(x, intake.pastMedicalHistory));
            }
            if (intake?.surgicalHistory) {
                setSurgicalHistory((x) => mergeTextBlocks(x, intake.surgicalHistory));
            }
            if (intake?.hospitalizations) {
                setHospitalizations((x) => mergeTextBlocks(x, intake.hospitalizations));
            }
            if (intake?.familyHistory) {
                setFamilyHistory((x) => mergeTextBlocks(x, intake.familyHistory));
            }
            if (intake?.immunizations) {
                setImmunizations((x) => mergeTextBlocks(x, intake.immunizations));
            }
            if (intake?.socialHistory) {
                setSocialHistory((x) => mergeTextBlocks(x, intake.socialHistory));
            }
            if (intake?.occupationalExposure) {
                setOccupationalExposure((x) => mergeTextBlocks(x, intake.occupationalExposure));
            }
            if (intake?.currentSymptoms?.length) {
                setCurrentSymptomsBlock((x) => mergeTextBlocks(x, intake.currentSymptoms.join(", ")));
            }
        }
        catch (e) {
            setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
        finally {
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
            const j = (await res.json());
            if (!res.ok)
                throw new Error(j.error ?? `Assistant failed (${res.status})`);
            applyAssistantIntake(j.patientIntake);
        }
        catch (e) {
            setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
        finally {
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
            const continuingHex = continueExistingCard && selectedCardId.trim()
                ? selectedCardId.trim().replace(/^0x/i, "").toLowerCase()
                : undefined;
            const { requestCode: code } = await createCredentialRequest(undefined, intake, continuingHex);
            setCreatedCode(code);
        }
        catch (e) {
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
        }
        catch (e) {
            setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
    };
    return (_jsx("section", { className: ui.section, "data-testid": "patient-view", children: _jsx("div", { className: ui.sectionInner, children: _jsxs("div", { className: "zk-patient-layout", children: [_jsxs("aside", { className: "zk-patient-sidebar", "aria-label": "Sections on this page", children: [_jsx("p", { className: "zk-patient-sidebar__title", children: "On this page" }), _jsxs("nav", { className: "zk-patient-sidebar__nav", children: [_jsx(PatientSectionLink, { id: "patient-overview", children: "Overview" }), _jsx(PatientSectionLink, { id: "patient-cards", children: "Cards on this device" }), _jsx(PatientSectionLink, { id: "patient-obtain", children: "Obtain your card" }), _jsx(PatientSectionLink, { id: "patient-health", children: "Health details" }), _jsx(PatientSectionLink, { id: "patient-step-1", children: "Step 1 \u00B7 Request code" }), _jsx(PatientSectionLink, { id: "patient-step-2", children: "Step 2 \u00B7 Fetch card" }), _jsx(PatientSectionLink, { id: "patient-trials", children: "Trial matching" })] })] }), _jsxs("div", { className: "zk-patient-main", children: [_jsx("div", { "data-testid": "patient-gate", className: "zk-patient-gate", children: _jsxs("div", { className: "zk-patient-gate__hero", children: [_jsxs("div", { id: "patient-overview", className: "zk-patient-anchor", children: [_jsx("p", { className: ui.sectionTitle, children: "Patient \u00B7 centerpiece" }), _jsx("h2", { className: ui.h2, children: "Your lifetime health card \u2014 the anchor for matching" }), _jsxs("p", { className: ui.lead, style: { maxWidth: "56ch" }, children: ["ZKClinic is built around a ", _jsx("strong", { children: "doctor-backed health card" }), " on your device. For follow-up with the ", _jsx("strong", { children: "same" }), " clinician, check ", _jsx("strong", { children: "Continue selected health card" }), " when you create a request \u2014 the on-chain id stays fixed and each visit adds a signed diagnosis entry. You can still ", _jsx("strong", { children: "merge older text" }), " into the form for context. Use the card for", " ", _jsx("strong", { children: "trial matching" }), " without exposing your full record."] })] }), _jsxs("div", { id: "patient-cards", className: "zk-patient-hero-cards", "data-testid": "patient-hero-cards", children: [_jsx("p", { className: ui.sectionTitle, children: "Your health card" }), _jsx("h3", { className: ui.h2, children: "Cards on this device" }), stored.length === 0 ? (_jsxs("div", { "data-testid": "patient-no-credentials", children: [_jsx("p", { className: ui.lead, children: "No card yet \u2014 create a request and fetch after your doctor signs." }), _jsx("p", { className: ui.msgMuted, children: "Nothing leaves this browser until you choose to run a trial check." })] })) : (_jsx("div", { className: "zk-health-card-grid", "data-testid": "patient-credential-list", children: stored.map((c) => (_jsx(PatientHistoryCard, { meta: c, revoked: revokedAmongStored.includes(c.credentialId), selected: c.credentialId === selectedCardId, onSelect: () => setSelectedCardId(c.credentialId), proofRefreshKey: proofRefreshKey }, c.credentialId))) }))] })] }) }), _jsxs("div", { id: "patient-obtain", className: "zk-patient-anchor", children: [_jsx("p", { className: ui.sectionTitle, children: "Obtain your card" }), _jsx("h2", { className: ui.h2, children: "Request & store your card" }), _jsxs("p", { className: ui.lead, children: ["Create a code for your doctor. After delivery, fetch here \u2014 continuing the same card updates the stored ciphertext in place. Or start a ", _jsx("strong", { children: "new" }), " card (leave the checkbox off). You can also", " ", _jsx("strong", { children: "merge an older card into the form" }), " for free-text history. Data stays local until you prove eligibility."] }), !contractConnected && (_jsxs("div", { className: ui.warningPanel, "data-testid": "patient-no-contract-banner", style: { marginBottom: "1rem" }, children: [_jsx("p", { style: { fontWeight: 700, marginBottom: "0.35rem" }, children: "Trial browse needs the contract" }), _jsxs("p", { style: { fontSize: "0.8125rem", margin: 0 }, children: ["Request codes and fetching credentials work with the verification API alone. To browse trials and refresh revocation from the chain, join a contract on ", _jsx("strong", { children: "Registry" }), " first."] })] })), flowMessage && (_jsx("p", { className: ui.msgFlow, "data-testid": "patient-flow", children: flowMessage })), error && (_jsx("p", { className: ui.msgError, "data-testid": "patient-error", role: "alert", children: error }))] }), _jsx("div", { className: ui.divider }), _jsxs("div", { id: "patient-health", className: "zk-patient-anchor", children: [_jsx("p", { className: ui.sectionTitle, children: "Health details (optional, private)" }), _jsx("h3", { className: ui.h2, children: "What goes on your card with the doctor's signature" }), _jsxs("p", { className: ui.lead, style: { maxWidth: "60ch" }, children: ["This stays off-chain: it is bundled into the encrypted payload your doctor delivers. Condition names you type are ", _jsx("strong", { children: "not" }), " auto-mapped to ICD codes \u2014 you may enter optional ICD-10 hints, use the assistant (may suggest codes when clearly inferable), and your doctor records authoritative ICD-10/ICD-11 codes when they sign. Those codes are merged with your intake on the card."] }), stored.length > 0 && (_jsxs("div", { className: ui.highlight, style: { marginBottom: "1rem", maxWidth: "42rem" }, "data-testid": "patient-merge-from-card", children: [_jsx("p", { className: ui.highlightLabel, children: "Follow-up visit \u2014 merge prior card" }), _jsx("p", { className: ui.msgMuted, style: { fontSize: "0.8125rem", marginBottom: "0.5rem" }, children: "Append encrypted details from a card already on this device into the form (deduplicated by diagnosis code). Add new rows or text for today, then create a new request \u2014 the clinician's new codes will merge into the next credential too." }), _jsxs("div", { className: ui.inputRow, style: { flexWrap: "wrap", gap: "0.5rem" }, children: [_jsx("select", { className: ui.input, style: { minWidth: "12rem", flex: "1 1 12rem" }, value: mergeSourceCredentialId, onChange: (e) => setMergeSourceCredentialId(e.target.value), "aria-label": "Stored card to merge from", children: stored.map((c) => (_jsxs("option", { value: c.credentialId, children: [formatShortId(c.credentialId), " \u00B7 ", new Date(c.fetchedAt).toLocaleDateString()] }, c.credentialId))) }), _jsx("button", { type: "button", className: ui.btn, "data-testid": "btn-merge-stored-card", disabled: mergeBusy || !mergeSourceCredentialId, onClick: () => void handleMergeFromStoredCard(), children: mergeBusy ? "Merging…" : "Merge into form →" })] })] })), _jsxs("div", { style: { marginBottom: "1rem" }, children: [_jsxs("p", { className: ui.msgMuted, style: { marginBottom: "0.35rem" }, children: ["Describe in your own words \u2014 optional Gemini assist on the verification API (", _jsx("code", { className: ui.code, children: "GEMINI_API_KEY" }), ")."] }), _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 3, placeholder: "e.g. Type 2 diabetes diagnosed 2019, on metformin; penicillin allergy; former smoker\u2026", value: assistPrompt, onChange: (e) => setAssistPrompt(e.target.value), "data-testid": "patient-assist-prompt" }), _jsx("button", { type: "button", className: ui.btn, style: { marginTop: "0.5rem" }, "data-testid": "btn-patient-assist", onClick: () => void handleAssistantFill(), disabled: assistBusy, children: assistBusy ? "Filling…" : "Autofill form from description →" })] }), _jsxs("div", { className: ui.stackSm, style: { maxWidth: "40rem" }, children: [_jsxs("label", { className: ui.msgMuted, children: ["Chief complaint (main reason for this visit, in your own words)", _jsx("input", { className: ui.input, style: { display: "block", width: "100%", marginTop: 4 }, placeholder: "e.g. Worsening headaches this week", value: chiefComplaint, onChange: (e) => setChiefComplaint(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Narrative / story", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 3, style: { display: "block", width: "100%", marginTop: 4 }, placeholder: "Timeline, context, what you have already tried\u2026", value: narrative, onChange: (e) => setNarrative(e.target.value) })] }), _jsx("p", { className: ui.sectionTitle, style: { marginTop: "0.5rem" }, children: "Conditions (add rows)" }), conditionRows.map((row, i) => (_jsxs("div", { className: ui.inputRow, style: { flexWrap: "wrap", gap: "0.35rem" }, children: [_jsx("input", { className: ui.input, placeholder: "Condition name", value: row.label, onChange: (e) => {
                                                            const next = [...conditionRows];
                                                            next[i] = { ...row, label: e.target.value };
                                                            setConditionRows(next);
                                                        } }), _jsx("input", { className: ui.input, placeholder: "ICD-10 (optional)", value: row.icd10, onChange: (e) => {
                                                            const next = [...conditionRows];
                                                            next[i] = { ...row, icd10: e.target.value };
                                                            setConditionRows(next);
                                                        } }), _jsx("input", { className: ui.input, placeholder: "When (e.g. 2019)", value: row.approxOnset, onChange: (e) => {
                                                            const next = [...conditionRows];
                                                            next[i] = { ...row, approxOnset: e.target.value };
                                                            setConditionRows(next);
                                                        } }), _jsx("input", { className: ui.input, placeholder: "Notes", value: row.notes, onChange: (e) => {
                                                            const next = [...conditionRows];
                                                            next[i] = { ...row, notes: e.target.value };
                                                            setConditionRows(next);
                                                        } })] }, i))), _jsx("button", { type: "button", className: ui.btn, onClick: () => setConditionRows([...conditionRows, { label: "", icd10: "", approxOnset: "", notes: "" }]), children: "+ Condition row" }), _jsxs("label", { className: ui.msgMuted, children: ["Medications (lines or commas)", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 3, style: { display: "block", width: "100%", marginTop: 4 }, value: medicationsBlock, onChange: (e) => setMedicationsBlock(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Drug allergies", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: medicationAllergiesBlock, onChange: (e) => setMedicationAllergiesBlock(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Other allergies", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: allergiesBlock, onChange: (e) => setAllergiesBlock(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Environmental / food allergens", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: environmentalAllergensBlock, onChange: (e) => setEnvironmentalAllergensBlock(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Past medical history", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: pastMedicalHistory, onChange: (e) => setPastMedicalHistory(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Surgical history", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: surgicalHistory, onChange: (e) => setSurgicalHistory(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Hospitalizations", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: hospitalizations, onChange: (e) => setHospitalizations(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Family history", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: familyHistory, onChange: (e) => setFamilyHistory(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Immunizations", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: immunizations, onChange: (e) => setImmunizations(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Social history", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: socialHistory, onChange: (e) => setSocialHistory(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Occupational / exposure", _jsx("textarea", { className: `${ui.input} zk-patient-meds`, rows: 2, style: { display: "block", width: "100%", marginTop: 4 }, value: occupationalExposure, onChange: (e) => setOccupationalExposure(e.target.value) })] }), _jsxs("label", { className: ui.msgMuted, children: ["Current symptoms (comma-separated)", _jsx("input", { className: ui.input, style: { display: "block", width: "100%", marginTop: 4 }, value: currentSymptomsBlock, onChange: (e) => setCurrentSymptomsBlock(e.target.value) })] })] })] }), _jsx("div", { className: ui.divider }), _jsxs("div", { id: "patient-step-1", className: "zk-patient-anchor", children: [_jsx("p", { className: ui.sectionTitle, children: "Step 1" }), _jsx("h3", { className: ui.h2, children: "Create a request" }), stored.length > 0 && (_jsxs("label", { className: ui.msgMuted, style: { display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.75rem", maxWidth: "48ch" }, children: [_jsx("input", { type: "checkbox", checked: continueExistingCard, onChange: (e) => setContinueExistingCard(e.target.checked), "data-testid": "patient-continue-card-checkbox" }), _jsxs("span", { children: [_jsx("strong", { children: "Continue selected health card" }), " \u2014 same on-chain credential id; your doctor appends this visit's diagnosis to that card (you must use the same doctor who issued it). Card:", " ", _jsx("code", { className: ui.code, children: formatShortId(selectedCardId) })] })] })), _jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-create-request", onClick: handleCreateRequest, children: "Create request code" }), createdCode && (_jsxs("div", { className: ui.highlight, "data-testid": "patient-request-code-box", children: [_jsx("p", { className: ui.highlightLabel, children: "Share with your doctor" }), _jsx("div", { className: ui.codeBig, "data-testid": "patient-request-code", children: createdCode })] }))] }), _jsx("div", { className: ui.divider }), _jsxs("div", { id: "patient-step-2", className: "zk-patient-anchor", children: [_jsx("p", { className: ui.sectionTitle, children: "Step 2" }), _jsx("h3", { className: ui.h2, children: "Fetch when ready" }), _jsx("p", { className: ui.msgMuted, style: { marginBottom: "0.5rem" }, children: "Re-enter the same request code you created in Step 1 \u2014 your doctor used it to deliver the signed credential." }), _jsxs("div", { className: ui.inputRow, children: [_jsx("input", { className: ui.input, placeholder: "Your request code (e.g. ABC12XY9)", value: fetchCode, onChange: (e) => setFetchCode(e.target.value.toUpperCase()), "data-testid": "input-fetch-code" }), _jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-fetch-credential", onClick: handleFetchCredential, disabled: !fetchCode.trim(), children: "Fetch & store" })] }), contractConnected && state && (_jsx("button", { type: "button", className: ui.btn, style: { marginTop: "0.75rem" }, "data-testid": "btn-refresh-revocation", onClick: refreshState, children: "Refresh revocation status \u2192" })), revokedAmongStored.length > 0 && (_jsxs("div", { className: ui.warningPanel, "data-testid": "patient-revoked-banner", style: { marginTop: "1rem" }, children: [_jsx("p", { style: { fontWeight: 700, marginBottom: "0.35rem" }, children: "Revoked on-chain" }), _jsx("p", { style: { fontSize: "0.8125rem", margin: 0 }, children: "Your doctor revoked these credentials. They won\u2019t be accepted for new proofs." }), _jsx("ul", { className: ui.list, children: revokedAmongStored.map((id) => (_jsx("li", { children: _jsxs("code", { className: ui.code, children: [id.slice(0, 16), "\u2026"] }) }, id))) })] }))] }), _jsx("div", { id: "patient-trials", className: "zk-patient-anchor", children: _jsx(TrialBrowseView, { storedCredentials: stored, selectedCredentialId: selectedCardId, onCredentialChange: setSelectedCardId, onProofCreated: handleProofCreated }) })] })] }) }) }));
}
