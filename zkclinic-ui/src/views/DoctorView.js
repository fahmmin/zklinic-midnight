import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { createCredentialPayload, createCredentialPayloadContinuingCard, encryptCredential, diagnosisVisitCommitment, randomVisitNonceHex } from "../credential";
import { searchICD10, DEMO_ICD10_CODES } from "../icd10";
import { parseMedicationText } from "../lib/parseMedicationText";
import { icd11CodeToText, icd11TextToCodes } from "../lib/icd11Api";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { DEMO_DOCTOR_ICD10_CODES, DEMO_DOCTOR_MEDICATIONS_BLOCK, DEMO_IMR_RECORD_TEXT, DEMO_NMC_DOCTOR_ID, DEMO_NMC_REGISTRATION_NO, DEMO_OCR_NAME_HINT, DEMO_OCR_SMC_HINT } from "../lib/demoWorkspaceMocks";
import { ui } from "../ui";
const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";
export function DoctorView() {
    const { fetchCredentialRequest, deliverCredential, registerCredential, appendDiagnosisToCredential, revokeCredential, submitRequest, state, flowMessage, status, walletDoctorKeyHex } = useZKClinic();
    const [requestCode, setRequestCode] = useState("");
    const [requestInfo, setRequestInfo] = useState(null);
    const [icd10Input, setIcd10Input] = useState("");
    const [icd10Suggestions, setIcd10Suggestions] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState(() => [...DEMO_DOCTOR_ICD10_CODES]);
    const [icd11Input, setIcd11Input] = useState("");
    const [icd11Suggestions, setIcd11Suggestions] = useState([]);
    const [selectedIcd11, setSelectedIcd11] = useState([]);
    const [icd11Warnings, setIcd11Warnings] = useState([]);
    const [credentialToRevoke, setCredentialToRevoke] = useState("");
    const [medicationsText, setMedicationsText] = useState(DEMO_DOCTOR_MEDICATIONS_BLOCK);
    const [error, setError] = useState(null);
    // Doctor self-registration state
    const [regName, setRegName] = useState(DEMO_OCR_NAME_HINT);
    const [regDoctorId, setRegDoctorId] = useState(DEMO_NMC_DOCTOR_ID);
    const [regRegNo, setRegRegNo] = useState(DEMO_NMC_REGISTRATION_NO);
    const [regCouncil, setRegCouncil] = useState(DEMO_OCR_SMC_HINT);
    const [regImrText, setRegImrText] = useState(DEMO_IMR_RECORD_TEXT);
    const [regCertFile, setRegCertFile] = useState(null);
    const [regBusy, setRegBusy] = useState(false);
    const [regMessage, setRegMessage] = useState(null);
    const [regError, setRegError] = useState(null);
    const isDeployed = status === "deployed";
    const doctorPubKeyHex = walletDoctorKeyHex ?? null;
    const isApprovedDoctor = doctorPubKeyHex &&
        state?.issuers?.some((i) => i.doctor === doctorPubKeyHex.toLowerCase() && i.status === 2);
    const searchIcd10 = useCallback(async (q) => {
        if (!q.trim()) {
            setIcd10Suggestions(DEMO_ICD10_CODES);
            return;
        }
        try {
            const results = await searchICD10(q, 10);
            setIcd10Suggestions(results.length > 0 ? results : DEMO_ICD10_CODES);
        }
        catch {
            setIcd10Suggestions(DEMO_ICD10_CODES);
        }
    }, []);
    useEffect(() => {
        searchIcd10(icd10Input);
    }, [icd10Input, searchIcd10]);
    const searchIcd11 = useCallback(async (q) => {
        if (!q.trim()) {
            setIcd11Suggestions([]);
            setIcd11Warnings([]);
            return;
        }
        try {
            const { candidates, warnings } = await icd11TextToCodes(q);
            setIcd11Suggestions(candidates);
            setIcd11Warnings(warnings);
        }
        catch {
            setIcd11Suggestions([]);
            setIcd11Warnings(["Could not reach ICD-11 service"]);
        }
    }, []);
    useEffect(() => {
        const t = setTimeout(() => void searchIcd11(icd11Input), 350);
        return () => clearTimeout(t);
    }, [icd11Input, searchIcd11]);
    const handleLookupRequest = async () => {
        if (!requestCode.trim()) {
            setError("Enter request code");
            return;
        }
        setError(null);
        try {
            const info = await fetchCredentialRequest(requestCode.trim());
            setRequestInfo(info);
        }
        catch (e) {
            setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
            setRequestInfo(null);
        }
    };
    /**
     * Single doctor registration path:
     * IMR excerpt + certificate PDF → verification API validates and returns status;
     * then submit the derived licenseHash on-chain via submitRequest (admin still approves on-chain).
     */
    const handleDoctorRegistration = async () => {
        setRegError(null);
        setRegMessage(null);
        const docKey = doctorPubKeyHex;
        if (!docKey) {
            setRegError("Connect your wallet first so your doctor key is visible.");
            return;
        }
        if (!regDoctorId.trim() || !regRegNo.trim()) {
            setRegError("Doctor ID and registration number are required.");
            return;
        }
        if (!regImrText.trim() || regImrText.trim().length < 8) {
            setRegError("Paste or edit the IMR / register excerpt (at least 8 characters).");
            return;
        }
        if (!regCertFile) {
            setRegError("Attach a registration certificate PDF (required).");
            return;
        }
        setRegBusy(true);
        try {
            const body = {
                doctorPubKeyHex: docKey.replace(/^0x/, "").toLowerCase(),
                doctorId: regDoctorId.trim(),
                regdNoValue: regRegNo.trim(),
                imrRecordText: regImrText.trim(),
                certificateOcrText: `[PDF uploaded: ${regCertFile.name}]`
            };
            if (regName.trim())
                body.ocrNameHint = regName.trim();
            if (regCouncil.trim())
                body.ocrSmcHint = regCouncil.trim();
            const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/issuer-registration`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const j = (await res.json());
            if (!res.ok)
                throw new Error(j.error ?? `Registration failed (${res.status})`);
            const lic = (j.licenseHash ?? "").replace(/^0x/, "").toLowerCase();
            if (!/^[0-9a-f]{64}$/.test(lic))
                throw new Error("API returned an invalid licenseHash");
            // Submit on-chain so admin can approve
            await submitRequest(lic);
            const statusLabel = {
                pending_verification: "Pending registry verification (background check)",
                api_verified: "Verified off-chain (IMR + PDF receipt) — awaiting admin on-chain approval",
                pending_admin: "Match inconclusive — pending manual admin review",
                rejected: "Rejected by verification — contact admin",
                admin_approved: "Already approved"
            };
            setRegMessage(`Submitted on-chain. API status: ${statusLabel[j.status ?? ""] ?? j.status ?? "unknown"}` +
                ` · reg ${(j.registrationId ?? "").slice(0, 12)}…`);
        }
        catch (e) {
            setRegError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
        finally {
            setRegBusy(false);
        }
    };
    const addCode = (entry) => {
        if (!selectedCodes.includes(entry.code)) {
            setSelectedCodes([...selectedCodes, entry.code]);
        }
        setIcd10Input("");
    };
    const removeCode = (code) => {
        setSelectedCodes(selectedCodes.filter((c) => c !== code));
    };
    const addIcd11 = (entry) => {
        const c = entry.code.trim().toUpperCase();
        if (c && !selectedIcd11.includes(c)) {
            setSelectedIcd11([...selectedIcd11, c]);
        }
        setIcd11Input("");
    };
    const removeIcd11 = (code) => {
        setSelectedIcd11(selectedIcd11.filter((c) => c !== code));
    };
    const resolveIcd11Code = async () => {
        const raw = icd11Input.trim();
        if (!raw)
            return;
        setError(null);
        try {
            const { candidate, warnings } = await icd11CodeToText(raw);
            if (warnings?.length)
                setIcd11Warnings(warnings);
            if (candidate)
                addIcd11(candidate);
            else
                setError("Code not found — try plain-language search instead.");
        }
        catch (e) {
            setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
    };
    const handleSignAndDeliver = async () => {
        if (!requestCode.trim() || !requestInfo || requestInfo.hasCredential) {
            setError("Fetch a valid request first, or credential already delivered");
            return;
        }
        if (selectedCodes.length === 0 && selectedIcd11.length === 0) {
            setError("Add at least one ICD-10 or ICD-11 code");
            return;
        }
        if (!doctorPubKeyHex) {
            setError("Connect your wallet — your doctor key is needed to sign credentials.");
            return;
        }
        if (!isApprovedDoctor) {
            setError("Your wallet key is not an approved issuer on this contract. " +
                "Register below, then ask admin to approve your issuer request.");
            return;
        }
        setError(null);
        try {
            const medications = parseMedicationText(medicationsText);
            const cont = requestInfo.continuingCredentialId?.trim().replace(/^0x/i, "").toLowerCase();
            const isContinuing = !!cont && /^[0-9a-f]{64}$/.test(cont);
            const payload = isContinuing
                ? createCredentialPayloadContinuingCard(cont, doctorPubKeyHex, selectedCodes, undefined, {
                    medications,
                    icd11Codes: selectedIcd11.length ? selectedIcd11 : undefined,
                    patientIntake: requestInfo.patientIntake
                })
                : createCredentialPayload(doctorPubKeyHex, selectedCodes, undefined, {
                    medications,
                    icd11Codes: selectedIcd11.length ? selectedIcd11 : undefined,
                    patientIntake: requestInfo.patientIntake
                });
            const visitNonce = randomVisitNonceHex();
            const commitment = await diagnosisVisitCommitment({
                credentialId: payload.credentialId,
                icd10Codes: payload.icd10Codes,
                icd11Codes: payload.icd11Codes,
                issuedAtMs: payload.issuedAt,
                visitNonceHex: visitNonce
            });
            const encrypted = await encryptCredential(payload, requestCode.trim().toUpperCase(), {
                useCardKey: isContinuing
            });
            if (!isContinuing) {
                await registerCredential(payload.credentialId);
            }
            await appendDiagnosisToCredential(payload.credentialId, commitment);
            await deliverCredential(requestCode.trim().toUpperCase(), encrypted, payload.credentialId);
            setRequestInfo({ ...requestInfo, hasCredential: true });
            setSelectedCodes([]);
            setSelectedIcd11([]);
            setMedicationsText("");
        }
        catch (e) {
            setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
    };
    if (!isDeployed) {
        return (_jsx("section", { className: ui.section, "data-testid": "doctor-gate", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Doctor" }), _jsx("h2", { className: ui.h2, children: "Issue the health card" }), _jsx("p", { className: ui.lead, children: "Deploy or join a contract first \u2014 the card is what patients use for trial matching." })] }) }));
    }
    return (_jsx("section", { className: ui.section, "data-testid": "doctor-view", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Doctor \u00B7 attests the card" }), _jsx("h2", { className: ui.h2, children: "Sign & deliver the credential" }), _jsxs("p", { className: ui.lead, children: ["Look up the patient's request code, add this visit's diagnoses (ICD-10 and/or ICD-11).", " ", _jsx("strong", { children: "New card:" }), " the contract registers one credential id, then records this visit's diagnosis commitment on the card's on-chain timeline. ", _jsx("strong", { children: "Continuing card:" }), " when the patient flagged an existing card id, you only append a new commitment \u2014 same id, same issuing doctor. Encrypted updates use a key derived from that id so the patient can decrypt every visit."] }), flowMessage && _jsx("p", { className: ui.msgFlow, children: flowMessage }), error && (_jsx("p", { className: ui.msgError, role: "alert", "data-testid": "doctor-error", children: error })), !isApprovedDoctor && (_jsxs("div", { "data-testid": "doctor-registration-panel", children: [_jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "Step 1 \u00B7 one-time setup" }), _jsx("h3", { className: ui.h2, children: "Register as a doctor" }), _jsx("p", { className: ui.lead, style: { maxWidth: "58ch" }, children: "One registration path: paste an IMR / register excerpt and upload your registration certificate PDF. Off-chain verification checks the excerpt and registers the certificate upload; your issuer request is submitted on-chain in the same step. An admin still approves the issuer on-chain." }), regError && (_jsx("p", { className: ui.msgError, role: "alert", "data-testid": "doctor-reg-error", children: regError })), regMessage && (_jsx("p", { className: ui.msg, "data-testid": "doctor-reg-message", children: regMessage })), _jsxs("div", { className: ui.stackSm, style: { maxWidth: "36rem", marginTop: "0.75rem" }, children: [_jsxs("label", { className: ui.msgMuted, children: ["Full name", _jsx("input", { className: ui.input, style: { display: "block", width: "100%", marginTop: 4 }, placeholder: "Dr. Ananya Sharma", value: regName, onChange: (e) => setRegName(e.target.value), "data-testid": "input-reg-name" })] }), _jsxs("label", { className: ui.msgMuted, children: ["IMR / register excerpt", _jsx("textarea", { className: `${ui.input} zk-doctor-imr`, rows: 5, style: { display: "block", width: "100%", marginTop: 4, maxWidth: "40rem" }, placeholder: "Paste IMR or register excerpt\u2026", value: regImrText, onChange: (e) => setRegImrText(e.target.value), "data-testid": "input-reg-imr-text" })] }), _jsxs("label", { className: ui.msgMuted, children: ["Doctor ID (IMR / NMC)", _jsx("input", { className: ui.input, style: { display: "block", width: "100%", marginTop: 4 }, placeholder: "e.g. 6085963", value: regDoctorId, onChange: (e) => setRegDoctorId(e.target.value), "data-testid": "input-reg-doctor-id" })] }), _jsxs("label", { className: ui.msgMuted, children: ["Registration number", _jsx("input", { className: ui.input, style: { display: "block", width: "100%", marginTop: 4 }, placeholder: "e.g. DL45218", value: regRegNo, onChange: (e) => setRegRegNo(e.target.value), "data-testid": "input-reg-reg-no" })] }), _jsxs("label", { className: ui.msgMuted, children: ["Council / State Medical Council (optional)", _jsx("input", { className: ui.input, style: { display: "block", width: "100%", marginTop: 4 }, placeholder: "e.g. Delhi Medical Council", value: regCouncil, onChange: (e) => setRegCouncil(e.target.value), "data-testid": "input-reg-council" })] }), _jsxs("label", { className: ui.msgMuted, children: ["Registration certificate PDF (required)", _jsx("input", { type: "file", accept: ".pdf,application/pdf", className: ui.input, style: { display: "block", marginTop: 4 }, "data-testid": "input-reg-cert-pdf", onChange: (e) => setRegCertFile(e.target.files?.[0] ?? null) }), regCertFile ? (_jsxs("span", { className: ui.msgMuted, style: { fontSize: "0.75rem" }, children: [regCertFile.name, " selected \u2713"] })) : (_jsx("span", { className: ui.msgMuted, style: { fontSize: "0.75rem" }, children: "Choose a file to enable auto off-chain verification." }))] })] }), _jsx("button", { type: "button", className: ui.btnPrimary, style: { marginTop: "1rem" }, "data-testid": "btn-doctor-register", onClick: () => void handleDoctorRegistration(), disabled: regBusy ||
                                !regDoctorId.trim() ||
                                !regRegNo.trim() ||
                                regImrText.trim().length < 8 ||
                                !regCertFile, children: regBusy ? "Registering…" : "Register & submit request →" }), _jsx("p", { className: ui.msgMuted, style: { fontSize: "0.75rem", marginTop: "0.5rem" }, children: "With IMR excerpt + PDF attached, off-chain verification completes immediately; then use Admin \u2192 Approve issuer after your on-chain request appears." })] })), _jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "Lookup" }), _jsx("h3", { className: ui.h2, children: "Patient request code" }), _jsxs("div", { className: ui.inputRow, children: [_jsx("input", { className: ui.input, placeholder: "e.g. ABC12XY9", value: requestCode, onChange: (e) => {
                                setRequestCode(e.target.value.toUpperCase());
                                setRequestInfo(null);
                            }, "data-testid": "input-request-code" }), _jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-lookup-request", onClick: handleLookupRequest, disabled: !requestCode.trim(), children: "Look up \u2192" })] }), requestInfo && (_jsxs("p", { className: ui.msg, "data-testid": "request-info", children: ["Request ", _jsxs("code", { className: ui.code, children: [requestInfo.requestId.slice(0, 12), "\u2026"] }), requestInfo.hasCredential ? (_jsx("span", { style: { color: "var(--zk-green-dark)" }, children: " \u2014 Delivered" })) : (_jsx("span", { children: " \u2014 Ready to sign" })), requestInfo.hasPatientIntake ? (_jsx("span", { children: " \u00B7 Patient intake attached (merged into encrypted card)" })) : null, requestInfo.hasContinuingCredentialId && requestInfo.continuingCredentialId ? (_jsxs("span", { children: [" ", "\u00B7 ", _jsx("strong", { children: "Continuing card" }), " ", _jsxs("code", { className: ui.code, children: [requestInfo.continuingCredentialId.slice(0, 12), "\u2026"] })] })) : null] })), requestInfo?.patientIntake && !requestInfo.hasCredential && (_jsxs("div", { className: ui.highlight, style: { marginTop: "0.75rem" }, "data-testid": "doctor-patient-intake-preview", children: [_jsx("p", { className: ui.highlightLabel, children: "Patient-provided context (private)" }), _jsxs("ul", { className: ui.list, style: { fontSize: "0.8125rem", margin: 0 }, children: [requestInfo.patientIntake.chiefComplaint ? (_jsxs("li", { children: [_jsx("strong", { children: "Chief complaint:" }), " ", requestInfo.patientIntake.chiefComplaint] })) : null, requestInfo.patientIntake.narrative ? (_jsxs("li", { children: [_jsx("strong", { children: "Narrative:" }), " ", requestInfo.patientIntake.narrative.slice(0, 280), requestInfo.patientIntake.narrative.length > 280 ? "…" : ""] })) : null, (requestInfo.patientIntake.conditions?.length ?? 0) > 0 ? (_jsxs("li", { children: [_jsx("strong", { children: "Conditions:" }), " ", requestInfo.patientIntake.conditions
                                            .map((c) => c.label || c.icd10 || c.icd11 || "—")
                                            .join("; ")] })) : null, (requestInfo.patientIntake.medicationsList?.length ?? 0) > 0 ? (_jsxs("li", { children: [_jsx("strong", { children: "Med list (patient):" }), " ", requestInfo.patientIntake.medicationsList.join(", ")] })) : null, (requestInfo.patientIntake.allergies?.length ?? 0) > 0 ? (_jsxs("li", { children: [_jsx("strong", { children: "Allergies:" }), " ", requestInfo.patientIntake.allergies.join(", ")] })) : null] })] })), requestInfo && !requestInfo.hasCredential && (_jsxs(_Fragment, { children: [_jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "Diagnosis" }), _jsx("h3", { className: ui.h2, children: "ICD-10 codes (NLM)" }), _jsxs("div", { className: ui.relative, children: [_jsx("input", { className: ui.input, style: { width: "100%", maxWidth: "28rem" }, placeholder: "Search (e.g. diabetes, E11)", value: icd10Input, onChange: (e) => setIcd10Input(e.target.value), onFocus: () => icd10Input === "" && setIcd10Suggestions(DEMO_ICD10_CODES), "data-testid": "input-icd10-search" }), icd10Suggestions.length > 0 && (_jsx("ul", { className: ui.dropdown, "data-testid": "icd10-dropdown", children: icd10Suggestions.slice(0, 8).map((entry, i) => (_jsxs("li", { onClick: () => addCode(entry), onKeyDown: (ev) => {
                                            if (ev.key === "Enter")
                                                addCode(entry);
                                        }, role: "option", children: [_jsx("code", { className: ui.code, children: entry.code }), " \u2014 ", entry.name] }, `${entry.code}-${i}`))) }))] }), selectedCodes.length > 0 && (_jsx("div", { style: { marginTop: "0.75rem" }, "data-testid": "icd10-selected", children: selectedCodes.map((c) => (_jsxs("span", { className: ui.chip, children: [c, _jsx("button", { type: "button", onClick: () => removeCode(c), "aria-label": `Remove ${c}`, children: "\u00D7" })] }, c))) })), _jsx("h3", { className: ui.h2, style: { marginTop: "1rem" }, children: "ICD-11 (plain language or code)" }), _jsx("p", { className: ui.msgMuted, style: { marginBottom: "0.5rem" }, children: "Uses verification API: LLM suggestions + WHO validation when configured." }), icd11Warnings.length > 0 && (_jsx("p", { className: ui.msgMuted, style: { fontSize: "0.75rem" }, children: icd11Warnings.join(" · ") })), _jsxs("div", { className: ui.inputRow, style: { flexWrap: "wrap", maxWidth: "28rem" }, children: [_jsx("input", { className: ui.input, style: { flex: 1, minWidth: "12rem" }, placeholder: "e.g. type 2 diabetes or MMS code (5A11)", value: icd11Input, onChange: (e) => setIcd11Input(e.target.value), "data-testid": "input-icd11-search" }), _jsx("button", { type: "button", className: ui.btn, "data-testid": "btn-icd11-resolve-code", onClick: () => void resolveIcd11Code(), children: "Resolve code" })] }), _jsx("div", { className: ui.relative, children: icd11Suggestions.length > 0 && (_jsx("ul", { className: ui.dropdown, "data-testid": "icd11-dropdown", children: icd11Suggestions.slice(0, 8).map((entry, i) => (_jsxs("li", { onClick: () => addIcd11(entry), onKeyDown: (ev) => {
                                        if (ev.key === "Enter")
                                            addIcd11(entry);
                                    }, role: "option", children: [_jsx("code", { className: ui.code, children: entry.code }), " \u2014 ", entry.title, entry.validatedByWho ? " ✓" : ""] }, `${entry.code}-${i}`))) })) }), selectedIcd11.length > 0 && (_jsx("div", { style: { marginTop: "0.75rem" }, "data-testid": "icd11-selected", children: selectedIcd11.map((c) => (_jsxs("span", { className: ui.chip, children: [c, _jsx("button", { type: "button", onClick: () => removeIcd11(c), "aria-label": `Remove ${c}`, children: "\u00D7" })] }, c))) })), _jsx("div", { className: ui.divider, style: { margin: "1.25rem 0" } }), _jsx("p", { className: ui.sectionTitle, children: "Medications" }), _jsx("h3", { className: ui.h2, children: "Prescriptions & supplements" }), _jsx("p", { className: ui.msgMuted, style: { marginBottom: "0.5rem" }, children: "One per line or comma-separated. Included in the encrypted credential (not on-chain in plain text)." }), _jsx("textarea", { className: `${ui.input} zk-doctor-meds`, rows: 4, placeholder: "Metformin 500mg twice daily\nLisinopril 10mg", value: medicationsText, onChange: (e) => setMedicationsText(e.target.value), "data-testid": "doctor-medications" })] })), requestInfo && !requestInfo.hasCredential && (selectedCodes.length > 0 || selectedIcd11.length > 0) && (_jsx("div", { style: { marginTop: "1.25rem" }, children: _jsx("button", { type: "button", className: ui.btnArrow, "data-testid": "btn-sign-deliver", onClick: handleSignAndDeliver, disabled: !isApprovedDoctor, children: "Sign & deliver" }) })), isApprovedDoctor && (_jsxs(_Fragment, { children: [_jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "Safety" }), _jsx("h3", { className: ui.h2, children: "Revoke credential" }), _jsx("p", { className: ui.lead, children: "On-chain revocation by credential ID (64 hex)." }), _jsxs("div", { className: ui.inputRow, children: [_jsx("input", { className: ui.input, placeholder: "Credential ID (64 hex)", value: credentialToRevoke, onChange: (e) => setCredentialToRevoke(e.target.value), "data-testid": "input-revoke-credential" }), _jsx("button", { type: "button", className: ui.btn, "data-testid": "btn-revoke-credential", onClick: async () => {
                                        setError(null);
                                        try {
                                            await revokeCredential(credentialToRevoke.trim());
                                            setCredentialToRevoke("");
                                        }
                                        catch (e) {
                                            setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
                                        }
                                    }, disabled: credentialToRevoke.trim().length !== 64, children: "Revoke" })] })] }))] }) }));
}
