import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from "react";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { createCredentialId } from "../credential";
import { criteriaHashHex, eligibilityPercentToBps, validateTrialCriteriaShape, stableStringify, trialCriteriaWireForm } from "../trialCriteria";
import { searchICD10, DEMO_ICD10_CODES } from "../icd10";
import { icd11TextToCodes } from "../lib/icd11Api";
import { ui } from "../ui";
import { demoTrialDeadlineLocal, DEMO_TRIAL_ASSIST_PROMPT, DEMO_TRIAL_EXCLUSION_ICD10, DEMO_TRIAL_EXCLUSION_MEDS, DEMO_TRIAL_INCLUSION_ICD10, DEMO_TRIAL_SHORT_DESCRIPTION, DEMO_TRIAL_TITLE } from "../lib/demoWorkspaceMocks";
const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";
/** When set, skip `/trials/validate` and `POST /trials` — only Midnight `createTrial` runs (criteria hash is still computed locally). */
const SKIP_TRIAL_METADATA_API = import.meta.env.VITE_SKIP_TRIAL_METADATA_API === "1" ||
    import.meta.env.VITE_SKIP_TRIAL_METADATA_API === "true";
const LAB_OPS = ["=", "<", ">", "<=", ">="];
const emptyLab = () => ({
    testName: "",
    operator: ">=",
    threshold: 0,
    unit: ""
});
export function TrialManagerView() {
    const { createTrial, closeTrial, recordEnrollment, state, flowMessage, status, walletDoctorKeyHex } = useZKClinic();
    const [title, setTitle] = useState(DEMO_TRIAL_TITLE);
    const [shortDescription, setShortDescription] = useState(DEMO_TRIAL_SHORT_DESCRIPTION);
    const [inclusionCodes, setInclusionCodes] = useState(() => [...DEMO_TRIAL_INCLUSION_ICD10]);
    const [exclusionCodes, setExclusionCodes] = useState(() => [...DEMO_TRIAL_EXCLUSION_ICD10]);
    const [inclusionIcd11, setInclusionIcd11] = useState([]);
    const [exclusionIcd11, setExclusionIcd11] = useState([]);
    const [icd10Input, setIcd10Input] = useState("");
    const [icd10ExInput, setIcd10ExInput] = useState("");
    const [icd11IncInput, setIcd11IncInput] = useState("");
    const [icd11ExcInput, setIcd11ExcInput] = useState("");
    const [icd10Suggestions, setIcd10Suggestions] = useState([]);
    const [icd10ExSuggestions, setIcd10ExSuggestions] = useState([]);
    const [icd11IncSug, setIcd11IncSug] = useState([]);
    const [icd11ExcSug, setIcd11ExcSug] = useState([]);
    const [exclusionMeds, setExclusionMeds] = useState(DEMO_TRIAL_EXCLUSION_MEDS);
    const [ageMin, setAgeMin] = useState("");
    const [ageMax, setAgeMax] = useState("");
    const [labRows, setLabRows] = useState([]);
    const [slotsTotal, setSlotsTotal] = useState("20");
    const [deadlineLocal, setDeadlineLocal] = useState(() => demoTrialDeadlineLocal());
    /** Minimum match % on non-exclusion criteria (default 75). Committed on-chain as basis points. */
    const [eligibilityThresholdPercent, setEligibilityThresholdPercent] = useState("75");
    const [trialActionId, setTrialActionId] = useState("");
    const [error, setError] = useState(null);
    const [trialAssistPrompt, setTrialAssistPrompt] = useState(DEMO_TRIAL_ASSIST_PROMPT);
    const [trialAssistBusy, setTrialAssistBusy] = useState(false);
    const [validatePreview, setValidatePreview] = useState(null);
    const [managerProofs, setManagerProofs] = useState([]);
    const [proofsFetchError, setProofsFetchError] = useState(null);
    const isDeployed = status === "deployed";
    const searchIcd10Cb = useCallback(async (q, setSug) => {
        if (!q.trim()) {
            setSug(DEMO_ICD10_CODES);
            return;
        }
        try {
            const results = await searchICD10(q, 12);
            setSug(results.length > 0 ? results : DEMO_ICD10_CODES);
        }
        catch {
            setSug(DEMO_ICD10_CODES);
        }
    }, []);
    useEffect(() => {
        searchIcd10Cb(icd10Input, setIcd10Suggestions);
    }, [icd10Input, searchIcd10Cb]);
    useEffect(() => {
        searchIcd10Cb(icd10ExInput, setIcd10ExSuggestions);
    }, [icd10ExInput, searchIcd10Cb]);
    const searchIcd11 = useCallback(async (q, setSug) => {
        if (!q.trim()) {
            setSug([]);
            return;
        }
        try {
            const { candidates } = await icd11TextToCodes(q);
            setSug(candidates);
        }
        catch {
            setSug([]);
        }
    }, []);
    useEffect(() => {
        const t = setTimeout(() => void searchIcd11(icd11IncInput, setIcd11IncSug), 400);
        return () => clearTimeout(t);
    }, [icd11IncInput, searchIcd11]);
    useEffect(() => {
        const t = setTimeout(() => void searchIcd11(icd11ExcInput, setIcd11ExcSug), 400);
        return () => clearTimeout(t);
    }, [icd11ExcInput, searchIcd11]);
    const addInclusion = (e) => {
        if (!inclusionCodes.includes(e.code))
            setInclusionCodes([...inclusionCodes, e.code]);
        setIcd10Input("");
    };
    const addExclusion = (e) => {
        if (!exclusionCodes.includes(e.code))
            setExclusionCodes([...exclusionCodes, e.code]);
        setIcd10ExInput("");
    };
    const addIcd11Inc = (c) => {
        const code = c.code.trim().toUpperCase();
        if (code && !inclusionIcd11.includes(code))
            setInclusionIcd11([...inclusionIcd11, code]);
        setIcd11IncInput("");
    };
    const addIcd11Exc = (c) => {
        const code = c.code.trim().toUpperCase();
        if (code && !exclusionIcd11.includes(code))
            setExclusionIcd11([...exclusionIcd11, code]);
        setIcd11ExcInput("");
    };
    const mergeTrialAssistantPartial = (raw) => {
        if (!raw || typeof raw !== "object")
            return;
        const p = raw;
        if (typeof p.title === "string" && p.title.trim())
            setTitle(p.title.trim());
        if (typeof p.shortDescription === "string")
            setShortDescription(p.shortDescription);
        if (Array.isArray(p.inclusionIcd10)) {
            const codes = p.inclusionIcd10.filter((c) => typeof c === "string").map((c) => c.trim().toUpperCase());
            if (codes.length)
                setInclusionCodes((prev) => Array.from(new Set([...prev, ...codes])));
        }
        if (Array.isArray(p.exclusionIcd10)) {
            const codes = p.exclusionIcd10.filter((c) => typeof c === "string").map((c) => c.trim().toUpperCase());
            if (codes.length)
                setExclusionCodes((prev) => Array.from(new Set([...prev, ...codes])));
        }
        if (Array.isArray(p.inclusionIcd11)) {
            const codes = p.inclusionIcd11
                .filter((c) => typeof c === "string")
                .map((c) => c.trim().toUpperCase());
            if (codes.length)
                setInclusionIcd11((prev) => Array.from(new Set([...prev, ...codes])));
        }
        if (Array.isArray(p.exclusionIcd11)) {
            const codes = p.exclusionIcd11
                .filter((c) => typeof c === "string")
                .map((c) => c.trim().toUpperCase());
            if (codes.length)
                setExclusionIcd11((prev) => Array.from(new Set([...prev, ...codes])));
        }
        if (Array.isArray(p.exclusionMedications)) {
            const meds = p.exclusionMedications.filter((m) => typeof m === "string").join(", ");
            if (meds)
                setExclusionMeds((prev) => (prev.trim() ? `${prev.trim()}, ${meds}` : meds));
        }
        if (typeof p.ageMin === "number" && Number.isFinite(p.ageMin))
            setAgeMin(String(Math.round(p.ageMin)));
        if (typeof p.ageMax === "number" && Number.isFinite(p.ageMax))
            setAgeMax(String(Math.round(p.ageMax)));
        if (typeof p.eligibilityThresholdPercent === "number" && Number.isFinite(p.eligibilityThresholdPercent)) {
            setEligibilityThresholdPercent(String(Math.round(p.eligibilityThresholdPercent)));
        }
        if (Array.isArray(p.labCriteria)) {
            const ops = new Set(["<", ">", "<=", ">=", "="]);
            const labs = p.labCriteria
                .filter((row) => row != null && typeof row === "object")
                .map((row) => {
                const opRaw = row.operator;
                const operator = typeof opRaw === "string" && ops.has(opRaw) ? opRaw : ">=";
                return {
                    testName: typeof row.testName === "string" ? row.testName : "",
                    operator,
                    threshold: typeof row.threshold === "number" && Number.isFinite(row.threshold) ? row.threshold : 0,
                    unit: typeof row.unit === "string" ? row.unit : ""
                };
            })
                .filter((r) => r.testName.trim());
            if (labs.length)
                setLabRows(labs);
        }
    };
    const runTrialAssistant = async () => {
        if (!trialAssistPrompt.trim()) {
            setError("Enter a trial description for the assistant.");
            return;
        }
        setError(null);
        setTrialAssistBusy(true);
        try {
            const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/assistant/fill-trial-criteria`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: trialAssistPrompt.trim() })
            });
            const j = (await res.json());
            if (!res.ok)
                throw new Error(j.error ?? `Assistant failed (${res.status})`);
            mergeTrialAssistantPartial(j.partial);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setTrialAssistBusy(false);
        }
    };
    const buildCriteria = (trialId) => {
        const th = eligibilityThresholdPercent.trim();
        const thresholdNum = th === "" ? 75 : Number(th);
        return {
            version: 1,
            trialId,
            title: title.trim(),
            shortDescription: shortDescription.trim() || undefined,
            inclusionIcd10: inclusionCodes,
            exclusionIcd10: exclusionCodes,
            inclusionIcd11: inclusionIcd11.length ? inclusionIcd11 : undefined,
            exclusionIcd11: exclusionIcd11.length ? exclusionIcd11 : undefined,
            exclusionMedications: exclusionMeds
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            eligibilityThresholdPercent: Number.isFinite(thresholdNum) ? Math.round(thresholdNum) : 75,
            ageMin: ageMin === "" ? undefined : Number(ageMin),
            ageMax: ageMax === "" ? undefined : Number(ageMax),
            labCriteria: labRows.filter((r) => r.testName.trim())
        };
    };
    const handlePostTrial = async () => {
        setError(null);
        setValidatePreview(null);
        if (!deadlineLocal) {
            setError("Choose a recruitment deadline");
            return;
        }
        const deadlineMs = BigInt(new Date(deadlineLocal).getTime());
        const slots = BigInt(slotsTotal.trim() || "0");
        if (slots <= 0n) {
            setError("Slots must be a positive integer");
            return;
        }
        const trialId = createCredentialId();
        const criteria = buildCriteria(trialId);
        const shapeErr = validateTrialCriteriaShape(criteria);
        if (shapeErr.length) {
            setError(shapeErr.join("; "));
            return;
        }
        const hashHex = await criteriaHashHex(criteria);
        setValidatePreview(`Wire JSON (hashed, first 200 chars): ${stableStringify(trialCriteriaWireForm(criteria)).slice(0, 200)}…`);
        if (!SKIP_TRIAL_METADATA_API) {
            const valRes = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/trials/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ criteria })
            });
            const valText = await valRes.text();
            let valJson = {};
            try {
                valJson = valText ? JSON.parse(valText) : {};
            }
            catch {
                setError(`Validation request failed (HTTP ${valRes.status}): ${valText.trim().slice(0, 400) || "empty or non-JSON response"}`);
                return;
            }
            if (!valRes.ok || !valJson.ok) {
                const reasons = [
                    ...(Array.isArray(valJson.errors) ? valJson.errors : []),
                    ...(Array.isArray(valJson.details) ? valJson.details : []),
                    ...(valJson.error ? [valJson.error] : [])
                ];
                setError(reasons.length
                    ? reasons.join("; ")
                    : `Validation failed (HTTP ${valRes.status}). Check the verification API logs and VITE_VERIFICATION_API_URL.`);
                return;
            }
            const postMeta = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/trials`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trialIdHex: trialId,
                    criteria,
                    criteriaHashHex: hashHex,
                    managerPubKeyHex: walletDoctorKeyHex ?? undefined
                })
            });
            if (!postMeta.ok) {
                const text = await postMeta.text();
                try {
                    const payload = JSON.parse(text);
                    const details = [...(payload.error ? [payload.error] : []), ...(payload.details ?? [])];
                    setError(`Metadata API ${postMeta.status}: ${details.join("; ") || text}`);
                }
                catch {
                    setError(`Metadata API ${postMeta.status}: ${text}`);
                }
                return;
            }
        }
        const th = eligibilityThresholdPercent.trim();
        const pct = th === "" ? 75 : Number(th);
        if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
            setError("Eligibility threshold must be 1–100 (percent).");
            return;
        }
        const thresholdBps = eligibilityPercentToBps(pct);
        await createTrial(trialId, slots, deadlineMs, hashHex, thresholdBps);
    };
    const myTrials = state?.trials?.filter((t) => walletDoctorKeyHex && t.manager === walletDoctorKeyHex.toLowerCase()) ?? [];
    const refreshManagerProofs = useCallback(async () => {
        if (!walletDoctorKeyHex)
            return;
        setProofsFetchError(null);
        try {
            const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/proofs?managerPubKeyHex=${encodeURIComponent(walletDoctorKeyHex)}`);
            if (!res.ok)
                throw new Error(String(res.status));
            const data = (await res.json());
            setManagerProofs(data.proofs ?? []);
        }
        catch (e) {
            setManagerProofs([]);
            setProofsFetchError(e instanceof Error ? e.message : String(e));
        }
    }, [walletDoctorKeyHex]);
    useEffect(() => {
        if (!isDeployed || !walletDoctorKeyHex)
            return;
        void refreshManagerProofs();
    }, [isDeployed, walletDoctorKeyHex, state?.trials?.length, refreshManagerProofs]);
    const TRIAL_STATUS = ["Open", "Closed", "Full"];
    return (_jsx("section", { className: ui.section, "data-testid": "trial-manager-view", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Trial managers \u00B7 matching supply" }), _jsx("h2", { className: ui.h2, children: "Define studies patients can match against" }), _jsxs("p", { className: ui.lead, children: ["This is the sponsor side of ", _jsx("strong", { children: "clinical trial matching" }), ": publish inclusion / exclusion criteria (ICD-10 + optional ICD-11 via the verification API), commit a criteria hash on-chain, and manage enrollment slots. Patients with a health card check fit privately on the Patient tab."] }), SKIP_TRIAL_METADATA_API && (_jsxs("p", { className: ui.msgMuted, role: "status", "data-testid": "trial-skip-metadata-api", children: [_jsx("strong", { children: "Midnight-first mode:" }), " ", _jsx("code", { className: ui.code, children: "VITE_SKIP_TRIAL_METADATA_API" }), " is on \u2014 the verification API will not store trial metadata (browse/proof flows that read", " ", _jsx("code", { className: ui.code, children: "GET /trials" }), " will not list this trial until you post it separately). The on-chain ", _jsx("code", { className: ui.code, children: "criteriaHash" }), " still matches the locally canonical JSON."] })), flowMessage && _jsx("p", { className: ui.msgFlow, children: flowMessage }), error && (_jsx("p", { className: ui.msgError, role: "alert", children: error })), !isDeployed && (_jsx("p", { className: ui.msgMuted, "data-testid": "trial-manager-gate", children: "Deploy or join a contract first." })), isDeployed && (_jsxs(_Fragment, { children: [_jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "New trial" }), _jsx("h3", { className: ui.h2, children: "Criteria & slots" }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-title-input", children: "Title" }), _jsx("input", { id: "trial-title-input", className: ui.input, value: title, onChange: (e) => setTitle(e.target.value), "data-testid": "input-trial-title", placeholder: "e.g. T2DM adjunct therapy", autoComplete: "off" })] }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-short-desc", children: "Short description" }), _jsx("textarea", { id: "trial-short-desc", className: ui.input, value: shortDescription, onChange: (e) => setShortDescription(e.target.value), placeholder: "Brief summary for your team (inclusion / exclusion in plain language)\u2026", rows: 4 })] }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-assist-prompt", children: "One-shot assistant (Gemini)" }), _jsx("p", { className: ui.fieldHint, id: "trial-assist-hint", children: "Runs on the verification API. Describe the trial in natural language; criteria fields below merge in. Review everything before posting." }), _jsx("textarea", { id: "trial-assist-prompt", className: ui.input, "aria-describedby": "trial-assist-hint", placeholder: "e.g. Phase 2 diabetes study, ages 30\u201370, HbA1c under 8%, exclude insulin users\u2026", value: trialAssistPrompt, onChange: (e) => setTrialAssistPrompt(e.target.value), "data-testid": "trial-assist-prompt", rows: 5 }), _jsx("button", { type: "button", className: ui.btnPrimary, style: { alignSelf: "flex-start", marginTop: "0.25rem" }, "data-testid": "btn-trial-assist", disabled: trialAssistBusy, onClick: () => void runTrialAssistant(), children: trialAssistBusy ? "Filling…" : "Autofill criteria from description →" })] }), _jsx("p", { className: ui.sectionTitle, style: { marginTop: "1rem" }, children: "Inclusion ICD-10" }), _jsx("div", { className: ui.inputRow, children: _jsx("input", { className: ui.input, placeholder: "Search ICD-10-CM", value: icd10Input, onChange: (e) => setIcd10Input(e.target.value) }) }), _jsx("ul", { className: ui.list, style: { maxHeight: 140, overflow: "auto" }, children: icd10Suggestions.map((s) => (_jsx("li", { children: _jsxs("button", { type: "button", className: ui.btn, onClick: () => addInclusion(s), children: ["+ ", s.code, " \u2014 ", s.name] }) }, s.code))) }), _jsxs("p", { className: ui.msgMuted, children: ["Selected: ", inclusionCodes.join(", ") || "—"] }), _jsx("p", { className: ui.sectionTitle, style: { marginTop: "1rem" }, children: "Exclusion ICD-10" }), _jsx("div", { className: ui.inputRow, children: _jsx("input", { className: ui.input, placeholder: "Search exclusions", value: icd10ExInput, onChange: (e) => setIcd10ExInput(e.target.value) }) }), _jsx("ul", { className: ui.list, style: { maxHeight: 120, overflow: "auto" }, children: icd10ExSuggestions.map((s) => (_jsx("li", { children: _jsxs("button", { type: "button", className: ui.btn, onClick: () => addExclusion(s), children: ["+ ", s.code] }) }, `ex-${s.code}`))) }), _jsx("p", { className: ui.msgMuted, children: exclusionCodes.join(", ") || "—" }), _jsx("p", { className: ui.sectionTitle, style: { marginTop: "1rem" }, children: "Inclusion ICD-11 (optional)" }), _jsx("input", { className: ui.input, placeholder: "Plain language \u2014 e.g. type 2 diabetes mellitus", value: icd11IncInput, onChange: (e) => setIcd11IncInput(e.target.value), "data-testid": "input-trial-icd11-inc" }), _jsx("ul", { className: ui.list, style: { maxHeight: 120, overflow: "auto" }, children: icd11IncSug.map((s) => (_jsx("li", { children: _jsxs("button", { type: "button", className: ui.btn, onClick: () => addIcd11Inc(s), children: ["+ ", s.code, " \u2014 ", s.title] }) }, `i11-${s.code}`))) }), _jsxs("p", { className: ui.msgMuted, children: ["Selected ICD-11: ", inclusionIcd11.join(", ") || "—"] }), _jsx("p", { className: ui.sectionTitle, style: { marginTop: "1rem" }, children: "Exclusion ICD-11 (optional)" }), _jsx("input", { className: ui.input, placeholder: "Search ICD-11 for exclusions", value: icd11ExcInput, onChange: (e) => setIcd11ExcInput(e.target.value) }), _jsx("ul", { className: ui.list, style: { maxHeight: 100, overflow: "auto" }, children: icd11ExcSug.map((s) => (_jsx("li", { children: _jsxs("button", { type: "button", className: ui.btn, onClick: () => addIcd11Exc(s), children: ["+ ", s.code] }) }, `e11-${s.code}`))) }), _jsx("p", { className: ui.msgMuted, children: exclusionIcd11.join(", ") || "—" }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-exclusion-meds", children: "Exclusion medications (comma-separated)" }), _jsx("input", { id: "trial-exclusion-meds", className: ui.input, value: exclusionMeds, onChange: (e) => setExclusionMeds(e.target.value), placeholder: "e.g. warfarin, metformin" })] }), _jsxs("div", { className: ui.fieldRow, children: [_jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-age-min", children: "Age min" }), _jsx("input", { id: "trial-age-min", className: ui.input, type: "number", min: 0, max: 120, value: ageMin, onChange: (e) => setAgeMin(e.target.value) })] }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-age-max", children: "Age max" }), _jsx("input", { id: "trial-age-max", className: ui.input, type: "number", min: 0, max: 120, value: ageMax, onChange: (e) => setAgeMax(e.target.value) })] })] }), _jsx("p", { className: ui.sectionTitle, style: { marginTop: "1rem" }, children: "Lab criteria (optional)" }), labRows.map((row, i) => (_jsxs("div", { className: ui.inputRow, style: { flexWrap: "wrap", gap: 8 }, children: [_jsx("input", { className: ui.input, placeholder: "Test name e.g. HbA1c", value: row.testName, onChange: (e) => {
                                        const next = [...labRows];
                                        next[i] = { ...row, testName: e.target.value };
                                        setLabRows(next);
                                    } }), _jsx("select", { className: ui.input, value: row.operator, onChange: (e) => {
                                        const next = [...labRows];
                                        next[i] = { ...row, operator: e.target.value };
                                        setLabRows(next);
                                    }, children: LAB_OPS.map((o) => (_jsx("option", { value: o, children: o }, o))) }), _jsx("input", { className: ui.input, type: "number", placeholder: "Threshold", value: row.threshold, onChange: (e) => {
                                        const next = [...labRows];
                                        next[i] = { ...row, threshold: Number(e.target.value) };
                                        setLabRows(next);
                                    } }), _jsx("input", { className: ui.input, placeholder: "Unit e.g. %", value: row.unit, onChange: (e) => {
                                        const next = [...labRows];
                                        next[i] = { ...row, unit: e.target.value };
                                        setLabRows(next);
                                    } }), _jsx("button", { type: "button", className: ui.btn, onClick: () => setLabRows(labRows.filter((_, j) => j !== i)), children: "Remove" })] }, i))), _jsx("button", { type: "button", className: ui.btn, onClick: () => setLabRows([...labRows, emptyLab()]), children: "+ Lab row" }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-match-threshold", children: "Minimum match score (%)" }), _jsx("input", { id: "trial-match-threshold", className: ui.input, style: { maxWidth: "10rem" }, type: "number", min: 1, max: 100, value: eligibilityThresholdPercent, onChange: (e) => setEligibilityThresholdPercent(e.target.value), "data-testid": "input-trial-match-threshold" }), _jsx("p", { className: ui.fieldHint, children: "Patients need at least this score on non-exclusion criteria (exclusions still block). Default 75%. Stored on-chain as basis points and in trial metadata hash." })] }), _jsxs("div", { className: ui.fieldRow, children: [_jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-slots-total", children: "Total slots" }), _jsx("input", { id: "trial-slots-total", className: ui.input, type: "number", min: 1, value: slotsTotal, onChange: (e) => setSlotsTotal(e.target.value), "data-testid": "input-trial-slots" })] }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-deadline-local", children: "Deadline (local)" }), _jsx("input", { id: "trial-deadline-local", className: ui.input, type: "datetime-local", value: deadlineLocal, onChange: (e) => setDeadlineLocal(e.target.value), "data-testid": "input-trial-deadline" })] })] }), validatePreview && (_jsx("p", { className: ui.msgMuted, style: { fontSize: "0.75rem" }, children: validatePreview })), _jsx("button", { type: "button", className: ui.btnPrimary, style: { marginTop: "0.75rem" }, "data-testid": "btn-post-trial", onClick: () => void handlePostTrial(), children: "Validate \u2192 store metadata \u2192 create on-chain" }), _jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "Manage trials (your wallet)" }), _jsx("h3", { className: ui.h2, children: "Close or record enrollment" }), _jsxs("div", { className: ui.field, children: [_jsx("label", { className: ui.fieldLabel, htmlFor: "trial-id-action", children: "Trial id (64 hex)" }), _jsx("input", { id: "trial-id-action", className: ui.inputMono, placeholder: "64-character hex trial identifier", value: trialActionId, onChange: (e) => setTrialActionId(e.target.value.trim().toLowerCase()), "data-testid": "input-trial-id-action", spellCheck: false, autoComplete: "off" })] }), _jsxs("div", { className: ui.inputRow, style: { marginTop: 8 }, children: [_jsx("button", { type: "button", className: ui.btn, "data-testid": "btn-close-trial", onClick: () => trialActionId && void closeTrial(trialActionId).catch((e) => setError(String(e))), disabled: !trialActionId || trialActionId.length !== 64, children: "Close trial" }), _jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-record-enrollment", onClick: () => trialActionId && void recordEnrollment(trialActionId).catch((e) => setError(String(e))), disabled: !trialActionId || trialActionId.length !== 64, children: "Record enrollment (+1 slot)" })] }), myTrials.length > 0 && (_jsx("ul", { className: ui.list, "data-testid": "trial-manager-my-list", children: myTrials.map((t) => (_jsxs("li", { children: [_jsxs("code", { className: ui.code, children: [t.trialId.slice(0, 16), "\u2026"] }), " \u2014 slots ", t.slotsFilled.toString(), "/", t.slotsTotal.toString(), " \u2014 ", TRIAL_STATUS[t.status] ?? t.status, " \u2014 min match \u2265", " ", (Number(t.eligibilityThresholdBps) / 100).toFixed(0), "%"] }, t.trialId))) })), _jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "Match submissions (verification API)" }), _jsxs("p", { className: ui.lead, children: ["When patients post a proof ID, the API stores their ", _jsx("strong", { children: "match score %" }), " and threshold for your trials. List refreshes when you load this tab; use refresh if the API was down."] }), proofsFetchError && (_jsxs("p", { className: ui.msgMuted, role: "status", children: ["Could not load proofs (", proofsFetchError, ")."] })), _jsx("button", { type: "button", className: ui.btn, onClick: () => void refreshManagerProofs(), children: "Refresh proof list" }), managerProofs.length > 0 ? (_jsxs("table", { className: ui.input, style: { marginTop: "0.75rem", width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }, "data-testid": "trial-manager-proofs-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { textAlign: "left", padding: "0.35rem" }, children: "Trial" }), _jsx("th", { style: { textAlign: "left", padding: "0.35rem" }, children: "Match %" }), _jsx("th", { style: { textAlign: "left", padding: "0.35rem" }, children: "Threshold %" }), _jsx("th", { style: { textAlign: "left", padding: "0.35rem" }, children: "Eligible" }), _jsx("th", { style: { textAlign: "left", padding: "0.35rem" }, children: "Proof ID" })] }) }), _jsx("tbody", { children: managerProofs.map((p) => (_jsxs("tr", { children: [_jsx("td", { style: { padding: "0.35rem" }, children: p.trialTitle }), _jsx("td", { style: { padding: "0.35rem" }, children: p.matchPercent != null ? `${p.matchPercent}%` : "—" }), _jsx("td", { style: { padding: "0.35rem" }, children: p.thresholdPercent != null ? `${p.thresholdPercent}%` : "—" }), _jsx("td", { style: { padding: "0.35rem" }, children: p.eligible ? "yes" : "no" }), _jsx("td", { style: { padding: "0.35rem" }, children: _jsx("code", { className: ui.code, children: p.proofId }) })] }, p.proofId))) })] })) : (!proofsFetchError && (_jsx("p", { className: ui.msgMuted, style: { marginTop: "0.5rem" }, children: "No proofs yet for your manager key, or API unreachable." })))] }))] }) }));
}
