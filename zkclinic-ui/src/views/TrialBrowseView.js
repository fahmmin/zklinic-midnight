import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { DisclosureSummary } from "../components/patient/DisclosureSummary";
import { proofExpiresInLabel } from "../components/patient/patientCardUtils";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { decryptCredential, isCredentialExpired } from "../credential";
import { DEMO_ICD10_CODES } from "../icd10";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { formatCriteriaPlainLanguage } from "../trialCriteria";
import { PROOF_VALIDITY_MS, criteriaForEvaluation, deriveTrialPseudonym, evaluateTrialEligibility, trialDiagnosisCategories } from "../trialProof";
import { upsertStoredProof } from "../proofStorage";
import { deadlineUrgency, loadSavedTrialIds, persistSavedTrialIds, slotsFillPercent, toggleSavedTrialId } from "../lib/savedTrials";
import { DEMO_TRIAL_BROWSE_SEARCH } from "../lib/demoWorkspaceMocks";
import { ui } from "../ui";
const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";
const TRIAL_STATUS = ["Open", "Closed", "Full"];
export function TrialBrowseView({ storedCredentials, selectedCredentialId: controlledCredentialId, onCredentialChange, onProofCreated }) {
    const { state, status, refreshState } = useZKClinic();
    const [apiTrials, setApiTrials] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(DEMO_TRIAL_BROWSE_SEARCH);
    const [diagnosisFilter, setDiagnosisFilter] = useState("all");
    const [openSlotsOnly, setOpenSlotsOnly] = useState(false);
    const [savedOnly, setSavedOnly] = useState(false);
    const [savedTrialIds, setSavedTrialIds] = useState(() => loadSavedTrialIds());
    const [sortMode, setSortMode] = useState("deadline");
    const [internalCredentialId, setInternalCredentialId] = useState("");
    const selectedCredentialId = controlledCredentialId !== undefined ? controlledCredentialId : internalCredentialId;
    const setSelectedCredentialId = onCredentialChange ?? setInternalCredentialId;
    const [evaluationState, setEvaluationState] = useState(null);
    const [postingTrialId, setPostingTrialId] = useState(null);
    /** Trial id (hex) for which the disclosure panel is open */
    const [disclosureOpenForTrialId, setDisclosureOpenForTrialId] = useState(null);
    const [disclosureAccepted, setDisclosureAccepted] = useState(false);
    const [lastPostedProof, setLastPostedProof] = useState(null);
    const isDeployed = status === "deployed";
    function handleToggleSaved(trialIdHex) {
        setSavedTrialIds((current) => {
            const next = toggleSavedTrialId(current, trialIdHex);
            persistSavedTrialIds(next);
            return next;
        });
    }
    useEffect(() => {
        if (controlledCredentialId !== undefined)
            return;
        if (!internalCredentialId && storedCredentials[0]) {
            setInternalCredentialId(storedCredentials[0].credentialId);
        }
    }, [controlledCredentialId, internalCredentialId, storedCredentials]);
    useEffect(() => {
        if (!isDeployed)
            return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/trials`);
                if (!res.ok)
                    throw new Error(String(res.status));
                const data = (await res.json());
                if (!cancelled)
                    setApiTrials(data.trials ?? []);
                setFetchError(null);
            }
            catch (error) {
                if (!cancelled) {
                    setApiTrials([]);
                    setFetchError(friendlyErrorMessage(error instanceof Error ? error.message : String(error)));
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isDeployed, state?.trials?.length]);
    const revokedCredentials = useMemo(() => new Set((state?.revokedCredentialIds ?? []).map((value) => value.toLowerCase())), [state?.revokedCredentialIds]);
    const chainById = useMemo(() => new Map((state?.trials ?? []).map((trial) => [trial.trialId.toLowerCase(), trial])), [state?.trials]);
    const diagnosisCategories = useMemo(() => Array.from(new Set(apiTrials.flatMap((trial) => trialDiagnosisCategories(trial.criteria)))).sort(), [apiTrials]);
    const filteredTrials = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const list = apiTrials.filter((trial) => {
            const chain = chainById.get(trial.trialIdHex.toLowerCase());
            const trialCategories = trialDiagnosisCategories(trial.criteria);
            const matchesCategory = diagnosisFilter === "all" || trialCategories.includes(diagnosisFilter);
            const matchesSearch = !query ||
                `${trial.criteria.title} ${trial.criteria.shortDescription ?? ""} ${trial.criteria.inclusionIcd10.join(" ")}`
                    .toLowerCase()
                    .includes(query);
            const hasOpenSlots = !openSlotsOnly ||
                (chain != null &&
                    chain.status === 0 &&
                    chain.slotsFilled < chain.slotsTotal &&
                    Number(chain.deadline) > Date.now());
            const matchesSaved = !savedOnly || savedTrialIds.includes(trial.trialIdHex.toLowerCase());
            return matchesCategory && matchesSearch && hasOpenSlots && matchesSaved;
        });
        return list.sort((left, right) => {
            if (sortMode === "recent")
                return right.postedAt - left.postedAt;
            const leftDeadline = Number(chainById.get(left.trialIdHex.toLowerCase())?.deadline ?? BigInt(Number.MAX_SAFE_INTEGER));
            const rightDeadline = Number(chainById.get(right.trialIdHex.toLowerCase())?.deadline ?? BigInt(Number.MAX_SAFE_INTEGER));
            return leftDeadline - rightDeadline;
        });
    }, [apiTrials, chainById, diagnosisFilter, openSlotsOnly, savedOnly, savedTrialIds, searchTerm, sortMode]);
    async function handleEvaluateTrial(trial) {
        setActionError(null);
        setDisclosureOpenForTrialId(null);
        setDisclosureAccepted(false);
        setLastPostedProof(null);
        const selectedCredential = storedCredentials.find((credential) => credential.credentialId === selectedCredentialId) ??
            storedCredentials[0];
        if (!selectedCredential) {
            setActionError("Add a health card on this device first (Patient tab).");
            return;
        }
        try {
            const credential = await decryptCredential(selectedCredential.encryptedCredential, selectedCredential.requestCode, selectedCredential.credentialId);
            const chain = chainById.get(trial.trialIdHex.toLowerCase());
            const criteriaMerged = criteriaForEvaluation(trial.criteria, chain);
            const evaluation = evaluateTrialEligibility(criteriaMerged, credential);
            const blocked = [];
            if (revokedCredentials.has(selectedCredential.credentialId.toLowerCase())) {
                blocked.push("This card was revoked on-chain.");
            }
            if (isCredentialExpired(credential)) {
                blocked.push("This card expired — ask your doctor for a new one.");
            }
            setEvaluationState({
                trialIdHex: trial.trialIdHex,
                credentialId: selectedCredential.credentialId,
                pseudonym: await deriveTrialPseudonym(selectedCredential.credentialId, trial.trialIdHex),
                blockedReason: blocked.length > 0 ? blocked.join(" ") : undefined,
                evaluation
            });
        }
        catch (error) {
            setActionError(friendlyErrorMessage(error instanceof Error ? error.message : String(error)));
            setEvaluationState(null);
        }
    }
    function handleOpenDisclosure(trial) {
        if (!evaluationState || evaluationState.trialIdHex !== trial.trialIdHex)
            return;
        if (!evaluationState.evaluation.eligible || evaluationState.blockedReason)
            return;
        setDisclosureOpenForTrialId(trial.trialIdHex);
        setDisclosureAccepted(false);
        setActionError(null);
    }
    async function handleCreateProof(trial) {
        if (!evaluationState || evaluationState.trialIdHex !== trial.trialIdHex)
            return;
        if (!evaluationState.evaluation.eligible || evaluationState.blockedReason)
            return;
        if (!disclosureAccepted) {
            setActionError("Confirm the disclosure box to continue.");
            return;
        }
        setPostingTrialId(trial.trialIdHex);
        setActionError(null);
        try {
            const createdAt = Date.now();
            const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/proofs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trialIdHex: trial.trialIdHex,
                    criteriaHashHex: trial.criteriaHashHex,
                    proof: {
                        pseudonym: evaluationState.pseudonym,
                        eligible: true,
                        matchPercent: evaluationState.evaluation.matchPercent,
                        thresholdPercent: evaluationState.evaluation.thresholdPercent,
                        createdAt,
                        expiresAt: createdAt + PROOF_VALIDITY_MS,
                        criterionResults: evaluationState.evaluation.criterionResults
                    }
                })
            });
            if (!res.ok) {
                throw new Error(await res.text());
            }
            const proof = (await res.json());
            upsertStoredProof({
                proofId: proof.proofId,
                trialId: trial.trialIdHex,
                trialTitle: trial.criteria.title,
                credentialId: evaluationState.credentialId,
                pseudonym: proof.pseudonym,
                eligible: proof.eligible,
                matchPercent: evaluationState.evaluation.matchPercent,
                thresholdPercent: evaluationState.evaluation.thresholdPercent,
                createdAt: proof.createdAt,
                expiresAt: proof.expiresAt,
                criterionResults: evaluationState.evaluation.criterionResults
            });
            setLastPostedProof({
                proofId: proof.proofId,
                expiresAt: proof.expiresAt,
                trialTitle: trial.criteria.title,
                pseudonym: proof.pseudonym
            });
            setDisclosureOpenForTrialId(null);
            setDisclosureAccepted(false);
            onProofCreated?.();
        }
        catch (error) {
            setActionError(friendlyErrorMessage(error instanceof Error ? error.message : String(error)));
        }
        finally {
            setPostingTrialId(null);
        }
    }
    if (!isDeployed)
        return null;
    return (_jsxs("div", { "data-testid": "trial-browse", children: [_jsx("div", { className: ui.divider }), _jsx("p", { className: ui.sectionTitle, children: "Trial matching" }), _jsx("h3", { className: ui.h2, children: "Match your card to open studies" }), _jsxs("p", { className: ui.lead, children: ["Select the health card above, filter trials, then run a match on this device. This is the core", " ", _jsx("strong", { children: "clinical trial matching" }), " flow \u2014 you confirm disclosure before a proof ID is created; only rule outcomes and the proof ID leave this context, not your raw chart."] }), lastPostedProof && (_jsxs("div", { className: ui.highlight, "data-testid": "proof-success-banner", style: { marginBottom: "1rem" }, children: [_jsx("p", { className: ui.highlightLabel, children: "Proof created" }), _jsx("p", { className: ui.msg, style: { margin: "0.25rem 0 0" }, children: _jsx("strong", { children: lastPostedProof.trialTitle }) }), _jsxs("p", { className: ui.msgMuted, style: { margin: "0.35rem 0 0", fontSize: "0.875rem" }, children: ["Proof ID ", _jsx("code", { className: ui.code, children: lastPostedProof.proofId }), " · ", "Trial pseudonym ", _jsx("code", { className: ui.code, children: lastPostedProof.pseudonym })] }), _jsxs("p", { className: ui.msgMuted, style: { margin: "0.35rem 0 0", fontSize: "0.8125rem" }, children: ["Valid ", proofExpiresInLabel(lastPostedProof.expiresAt), " \u00B7 Regenerate after 30 days if enrollment isn\u2019t done."] })] })), _jsxs("div", { className: ui.inputRow, style: { flexWrap: "wrap", alignItems: "end", gap: 12 }, children: [_jsxs("label", { children: ["Search", _jsx("input", { className: ui.input, placeholder: "Diabetes, E11.9, HbA1c", value: searchTerm, onChange: (event) => setSearchTerm(event.target.value) })] }), _jsxs("label", { children: ["Diagnosis category", _jsxs("select", { className: ui.input, value: diagnosisFilter, onChange: (event) => setDiagnosisFilter(event.target.value), children: [_jsx("option", { value: "all", children: "All" }), diagnosisCategories.map((category) => (_jsx("option", { value: category, children: category }, category)))] })] }), _jsxs("label", { children: ["Sort", _jsxs("select", { className: ui.input, value: sortMode, onChange: (event) => setSortMode(event.target.value), children: [_jsx("option", { value: "deadline", children: "Deadline soonest" }), _jsx("option", { value: "recent", children: "Newest first" })] })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }, children: [_jsx("input", { type: "checkbox", checked: openSlotsOnly, onChange: (event) => setOpenSlotsOnly(event.target.checked) }), "Open slots only"] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }, children: [_jsx("input", { type: "checkbox", checked: savedOnly, onChange: (event) => setSavedOnly(event.target.checked), "data-testid": "trial-browse-saved-only" }), "Saved only (", savedTrialIds.length, ")"] })] }), _jsxs("div", { className: ui.inputRow, style: { marginTop: "0.75rem", alignItems: "end" }, children: [_jsxs("label", { style: { flex: 1 }, children: ["Card for this check", _jsx("select", { className: ui.input, value: selectedCredentialId, onChange: (event) => setSelectedCredentialId(event.target.value), disabled: storedCredentials.length === 0, "data-testid": "trial-browse-credential-select", children: storedCredentials.length === 0 ? (_jsx("option", { value: "", children: "No cards on this device" })) : (storedCredentials.map((credential) => (_jsxs("option", { value: credential.credentialId, children: ["Card \u00B7\u00B7\u00B7", credential.credentialId.slice(-4), " (", credential.requestCode, ")"] }, credential.credentialId)))) })] }), _jsx("button", { type: "button", className: ui.btn, "data-testid": "btn-refresh-trials-browse", onClick: () => void refreshState(), children: "Refresh on-chain trials" })] }), fetchError && (_jsxs("p", { className: ui.msgError, role: "alert", children: ["Can\u2019t load the trial list (", fetchError, "). Start the verification API if you\u2019re running locally."] })), actionError && (_jsx("p", { className: ui.msgError, role: "alert", "data-testid": "trial-browse-error", children: actionError })), filteredTrials.length === 0 && !fetchError && (_jsx("p", { className: ui.msgMuted, "data-testid": "trial-browse-empty", children: savedOnly && savedTrialIds.length === 0
                    ? "You haven’t saved any trials yet — tap the star on a trial to bookmark it on this device."
                    : "No trials matched the current filters." })), _jsx("ul", { className: ui.list, children: filteredTrials.map((trial) => {
                    const chain = chainById.get(trial.trialIdHex.toLowerCase());
                    const names = {};
                    const allCodes = [...trial.criteria.inclusionIcd10, ...trial.criteria.exclusionIcd10];
                    for (const code of allCodes) {
                        const match = DEMO_ICD10_CODES.find((item) => item.code === code);
                        names[code] = match?.name ?? code;
                    }
                    const lines = formatCriteriaPlainLanguage(trial.criteria, names);
                    const activeEvaluation = evaluationState?.trialIdHex === trial.trialIdHex ? evaluationState : null;
                    const disclosureOpen = disclosureOpenForTrialId === trial.trialIdHex;
                    const isSaved = savedTrialIds.includes(trial.trialIdHex.toLowerCase());
                    const urgency = chain ? deadlineUrgency(Number(chain.deadline)) : null;
                    return (_jsxs("li", { style: {
                            marginBottom: "1.25rem",
                            borderBottom: "1px solid var(--zk-border)",
                            paddingBottom: "1rem"
                        }, children: [_jsxs("div", { className: "zk-trial-head", children: [_jsx("p", { style: { fontWeight: 700, margin: "0 0 0.35rem" }, children: trial.criteria.title }), _jsx("button", { type: "button", className: "zk-star", "aria-pressed": isSaved, "aria-label": isSaved ? "Remove from saved trials" : "Save trial", title: isSaved ? "Saved on this device — click to remove" : "Save on this device", onClick: () => handleToggleSaved(trial.trialIdHex), "data-testid": `btn-save-${trial.trialIdHex.slice(0, 8)}`, children: isSaved ? "★" : "☆" })] }), lines.slice(1).map((line, index) => (_jsx("p", { className: ui.msgMuted, style: { fontSize: "0.875rem", margin: "0.2rem 0" }, children: line }, index))), chain ? (_jsxs("p", { className: ui.msg, style: { marginTop: "0.5rem" }, children: ["On-chain: slots ", chain.slotsFilled.toString(), "/", chain.slotsTotal.toString(), " \u00B7", " ", TRIAL_STATUS[chain.status] ?? chain.status, " \u00B7 deadline", " ", new Date(Number(chain.deadline)).toLocaleString()] })) : (_jsx("p", { className: ui.warnInline, style: { marginTop: "0.5rem" }, children: "Not found on this contract (join the contract that created this trial)." })), chain && urgency ? (_jsxs("div", { className: "zk-trial-meta", "data-testid": `trial-meta-${trial.trialIdHex.slice(0, 8)}`, children: [_jsx("span", { className: `zk-badge zk-badge--${urgency.tone}`, children: urgency.label }), _jsx("div", { className: "zk-meter", role: "progressbar", "aria-label": "Enrollment slots filled", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": slotsFillPercent(chain.slotsFilled, chain.slotsTotal), children: _jsx("div", { className: "zk-meter-fill", style: { width: `${slotsFillPercent(chain.slotsFilled, chain.slotsTotal)}%` } }) })] })) : null, _jsxs("div", { className: ui.inputRow, style: { marginTop: "0.75rem", alignItems: "center" }, children: [_jsx("button", { type: "button", className: ui.btnPrimary, onClick: () => void handleEvaluateTrial(trial), disabled: storedCredentials.length === 0, "data-testid": `btn-evaluate-${trial.trialIdHex.slice(0, 8)}`, children: "Evaluate locally" }), activeEvaluation?.evaluation.eligible && !activeEvaluation.blockedReason ? (_jsx("button", { type: "button", className: ui.btn, onClick: () => handleOpenDisclosure(trial), disabled: postingTrialId === trial.trialIdHex, "data-testid": `btn-disclosure-${trial.trialIdHex.slice(0, 8)}`, children: disclosureOpen ? "Disclosure (see below)" : "Create proof ID" })) : null] }), activeEvaluation && (_jsxs("div", { className: ui.highlight, style: { marginTop: "0.75rem" }, children: [_jsx("p", { className: ui.highlightLabel, children: "Eligibility result" }), _jsxs("p", { className: ui.msg, style: { marginTop: 4 }, children: ["Match score ", _jsxs("strong", { children: [activeEvaluation.evaluation.matchPercent, "%"] }), " (need \u2265", " ", activeEvaluation.evaluation.thresholdPercent, "%) \u00B7", " ", activeEvaluation.evaluation.eligible ? "Eligible" : "Not eligible", activeEvaluation.evaluation.blockedByExclusion ? " (exclusion rule failed)" : "", " \u00B7 trial pseudonym ", _jsx("code", { className: ui.code, children: activeEvaluation.pseudonym })] }), activeEvaluation.blockedReason ? (_jsx("p", { className: ui.warnInline, style: { marginTop: 6 }, children: activeEvaluation.blockedReason })) : null, _jsx("ul", { className: ui.list, style: { marginTop: "0.5rem" }, children: activeEvaluation.evaluation.criterionResults.map((criterion) => (_jsxs("li", { children: [_jsx("strong", { children: criterion.passed ? "PASS" : "FAIL" }), " \u2014 ", criterion.label, ": ", criterion.detail] }, criterion.key))) })] })), disclosureOpen && activeEvaluation?.evaluation.eligible && !activeEvaluation.blockedReason && (_jsxs("div", { className: "zk-disclosure-panel", "data-testid": "disclosure-panel", style: { marginTop: "0.75rem", padding: "1rem", border: "2px solid var(--zk-border)" }, children: [_jsx("p", { className: ui.sectionTitle, style: { marginBottom: "0.5rem" }, children: "Before we post anything" }), _jsx(DisclosureSummary, {}), _jsxs("label", { style: {
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: 10,
                                            marginTop: "0.75rem",
                                            fontSize: "0.875rem",
                                            cursor: "pointer"
                                        }, children: [_jsx("input", { type: "checkbox", checked: disclosureAccepted, onChange: (e) => setDisclosureAccepted(e.target.checked), "data-testid": "disclosure-accept-checkbox" }), _jsx("span", { children: "I understand only pass/fail per rule and my proof ID will be shared \u2014 not my diagnosis, labs, medications, or identity." })] }), _jsxs("div", { className: ui.inputRow, style: { marginTop: "0.75rem" }, children: [_jsx("button", { type: "button", className: ui.btnPrimary, onClick: () => void handleCreateProof(trial), disabled: postingTrialId === trial.trialIdHex || !disclosureAccepted, "data-testid": "btn-confirm-proof", children: postingTrialId === trial.trialIdHex ? "Posting proof…" : "Confirm & post proof ID" }), _jsx("button", { type: "button", className: ui.btn, onClick: () => {
                                                    setDisclosureOpenForTrialId(null);
                                                    setDisclosureAccepted(false);
                                                }, children: "Cancel" })] })] }))] }, trial.trialIdHex));
                }) })] }));
}
