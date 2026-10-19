import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "../components/CopyButton";
import { DisclosureSummary } from "../components/patient/DisclosureSummary";
import { proofExpiresInLabel } from "../components/patient/patientCardUtils";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { decryptCredential, isCredentialExpired } from "../credential";
import type { StoredCredentialMeta } from "../credentialStorage";
import { DEMO_ICD10_CODES } from "../icd10";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { formatCriteriaPlainLanguage, type TrialCriteriaV1 } from "../trialCriteria";
import {
  PROOF_VALIDITY_MS,
  criteriaForEvaluation,
  deriveTrialPseudonym,
  evaluateTrialEligibility,
  trialDiagnosisCategories,
  type EligibilityEvaluation
} from "../trialProof";
import { upsertStoredProof } from "../proofStorage";
import {
  deadlineUrgency,
  loadSavedTrialIds,
  persistSavedTrialIds,
  slotsFillPercent,
  toggleSavedTrialId
} from "../lib/savedTrials";
import { DEMO_TRIAL_BROWSE_SEARCH } from "../lib/demoWorkspaceMocks";
import { ui } from "../ui";

const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

const TRIAL_STATUS = ["Open", "Closed", "Full"];

type ApiTrial = {
  trialIdHex: string;
  criteria: TrialCriteriaV1;
  criteriaHashHex: string;
  postedAt: number;
};

export type TrialBrowseViewProps = {
  storedCredentials: StoredCredentialMeta[];
  /** When set with onCredentialChange, credential picker is controlled by parent (e.g. health card). */
  selectedCredentialId?: string;
  onCredentialChange?: (credentialId: string) => void;
  onProofCreated?: () => void;
};

type EvaluationState = {
  trialIdHex: string;
  credentialId: string;
  pseudonym: string;
  blockedReason?: string;
  evaluation: EligibilityEvaluation;
};

export function TrialBrowseView({
  storedCredentials,
  selectedCredentialId: controlledCredentialId,
  onCredentialChange,
  onProofCreated
}: TrialBrowseViewProps) {
  const { state, status, refreshState } = useZKClinic();
  const [apiTrials, setApiTrials] = useState<ApiTrial[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(DEMO_TRIAL_BROWSE_SEARCH);
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");
  const [openSlotsOnly, setOpenSlotsOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedTrialIds, setSavedTrialIds] = useState<string[]>(() => loadSavedTrialIds());
  const [sortMode, setSortMode] = useState<"deadline" | "recent">("deadline");
  const [internalCredentialId, setInternalCredentialId] = useState("");

  const selectedCredentialId =
    controlledCredentialId !== undefined ? controlledCredentialId : internalCredentialId;

  const setSelectedCredentialId = onCredentialChange ?? setInternalCredentialId;

  const [evaluationState, setEvaluationState] = useState<EvaluationState | null>(null);
  const [postingTrialId, setPostingTrialId] = useState<string | null>(null);
  /** Trial id (hex) for which the disclosure panel is open */
  const [disclosureOpenForTrialId, setDisclosureOpenForTrialId] = useState<string | null>(null);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const [lastPostedProof, setLastPostedProof] = useState<{
    proofId: string;
    expiresAt: number;
    trialTitle: string;
    pseudonym: string;
  } | null>(null);

  const isDeployed = status === "deployed";

  function handleToggleSaved(trialIdHex: string) {
    setSavedTrialIds((current) => {
      const next = toggleSavedTrialId(current, trialIdHex);
      persistSavedTrialIds(next);
      return next;
    });
  }

  useEffect(() => {
    if (controlledCredentialId !== undefined) return;
    if (!internalCredentialId && storedCredentials[0]) {
      setInternalCredentialId(storedCredentials[0].credentialId);
    }
  }, [controlledCredentialId, internalCredentialId, storedCredentials]);

  useEffect(() => {
    if (!isDeployed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/trials`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { trials?: ApiTrial[] };
        if (!cancelled) setApiTrials(data.trials ?? []);
        setFetchError(null);
      } catch (error) {
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

  const revokedCredentials = useMemo(
    () => new Set((state?.revokedCredentialIds ?? []).map((value) => value.toLowerCase())),
    [state?.revokedCredentialIds]
  );

  const chainById = useMemo(
    () => new Map((state?.trials ?? []).map((trial) => [trial.trialId.toLowerCase(), trial])),
    [state?.trials]
  );

  const diagnosisCategories = useMemo(
    () => Array.from(new Set(apiTrials.flatMap((trial) => trialDiagnosisCategories(trial.criteria)))).sort(),
    [apiTrials]
  );

  const filteredTrials = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = apiTrials.filter((trial) => {
      const chain = chainById.get(trial.trialIdHex.toLowerCase());
      const trialCategories = trialDiagnosisCategories(trial.criteria);
      const matchesCategory = diagnosisFilter === "all" || trialCategories.includes(diagnosisFilter);
      const matchesSearch =
        !query ||
        `${trial.criteria.title} ${trial.criteria.shortDescription ?? ""} ${trial.criteria.inclusionIcd10.join(" ")}`
          .toLowerCase()
          .includes(query);
      const hasOpenSlots =
        !openSlotsOnly ||
        (chain != null &&
          chain.status === 0 &&
          chain.slotsFilled < chain.slotsTotal &&
          Number(chain.deadline) > Date.now());
      const matchesSaved = !savedOnly || savedTrialIds.includes(trial.trialIdHex.toLowerCase());
      return matchesCategory && matchesSearch && hasOpenSlots && matchesSaved;
    });

    return list.sort((left, right) => {
      if (sortMode === "recent") return right.postedAt - left.postedAt;
      const leftDeadline = Number(
        chainById.get(left.trialIdHex.toLowerCase())?.deadline ?? BigInt(Number.MAX_SAFE_INTEGER)
      );
      const rightDeadline = Number(
        chainById.get(right.trialIdHex.toLowerCase())?.deadline ?? BigInt(Number.MAX_SAFE_INTEGER)
      );
      return leftDeadline - rightDeadline;
    });
  }, [apiTrials, chainById, diagnosisFilter, openSlotsOnly, savedOnly, savedTrialIds, searchTerm, sortMode]);

  async function handleEvaluateTrial(trial: ApiTrial) {
    setActionError(null);
    setDisclosureOpenForTrialId(null);
    setDisclosureAccepted(false);
    setLastPostedProof(null);
    const selectedCredential =
      storedCredentials.find((credential) => credential.credentialId === selectedCredentialId) ??
      storedCredentials[0];
    if (!selectedCredential) {
      setActionError("Add a health card on this device first (Patient tab).");
      return;
    }

    try {
      const credential = await decryptCredential(
        selectedCredential.encryptedCredential,
        selectedCredential.requestCode,
        selectedCredential.credentialId
      );
      const chain = chainById.get(trial.trialIdHex.toLowerCase());
      const criteriaMerged = criteriaForEvaluation(trial.criteria, chain);
      const evaluation = evaluateTrialEligibility(criteriaMerged, credential);
      const blocked: string[] = [];
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
    } catch (error) {
      setActionError(friendlyErrorMessage(error instanceof Error ? error.message : String(error)));
      setEvaluationState(null);
    }
  }

  function handleOpenDisclosure(trial: ApiTrial) {
    if (!evaluationState || evaluationState.trialIdHex !== trial.trialIdHex) return;
    if (!evaluationState.evaluation.eligible || evaluationState.blockedReason) return;
    setDisclosureOpenForTrialId(trial.trialIdHex);
    setDisclosureAccepted(false);
    setActionError(null);
  }

  async function handleCreateProof(trial: ApiTrial) {
    if (!evaluationState || evaluationState.trialIdHex !== trial.trialIdHex) return;
    if (!evaluationState.evaluation.eligible || evaluationState.blockedReason) return;
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
      const proof = (await res.json()) as {
        proofId: string;
        pseudonym: string;
        eligible: boolean;
        createdAt: number;
        expiresAt: number;
      };
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
    } catch (error) {
      setActionError(friendlyErrorMessage(error instanceof Error ? error.message : String(error)));
    } finally {
      setPostingTrialId(null);
    }
  }

  if (!isDeployed) return null;

  return (
    <div data-testid="trial-browse">
      <div className={ui.divider} />
      <p className={ui.sectionTitle}>Trial matching</p>
      <h3 className={ui.h2}>Match your card to open studies</h3>
      <p className={ui.lead}>
        Select the health card above, filter trials, then run a match on this device. This is the core{" "}
        <strong>clinical trial matching</strong> flow — you confirm disclosure before a proof ID is created; only rule
        outcomes and the proof ID leave this context, not your raw chart.
      </p>

      {lastPostedProof && (
        <div className={ui.highlight} data-testid="proof-success-banner" style={{ marginBottom: "1rem" }}>
          <p className={ui.highlightLabel}>Proof created</p>
          <p className={ui.msg} style={{ margin: "0.25rem 0 0" }}>
            <strong>{lastPostedProof.trialTitle}</strong>
          </p>
          <p className={ui.msgMuted} style={{ margin: "0.35rem 0 0", fontSize: "0.875rem" }}>
            Proof ID <code className={ui.code}>{lastPostedProof.proofId}</code>{" "}
            <CopyButton value={lastPostedProof.proofId} label="Copy proof ID" data-testid="btn-copy-proof-id" />
            {" · "}
            Trial pseudonym <code className={ui.code}>{lastPostedProof.pseudonym}</code>
          </p>
          <p className={ui.msgMuted} style={{ margin: "0.35rem 0 0", fontSize: "0.8125rem" }}>
            Valid {proofExpiresInLabel(lastPostedProof.expiresAt)} · Regenerate after 30 days if enrollment isn’t done.
          </p>
        </div>
      )}

      <div className={ui.inputRow} style={{ flexWrap: "wrap", alignItems: "end", gap: 12 }}>
        <label>
          Search
          <input
            className={ui.input}
            placeholder="Diabetes, E11.9, HbA1c"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <label>
          Diagnosis category
          <select
            className={ui.input}
            value={diagnosisFilter}
            onChange={(event) => setDiagnosisFilter(event.target.value)}
          >
            <option value="all">All</option>
            {diagnosisCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            className={ui.input}
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as "deadline" | "recent")}
          >
            <option value="deadline">Deadline soonest</option>
            <option value="recent">Newest first</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }}>
          <input
            type="checkbox"
            checked={openSlotsOnly}
            onChange={(event) => setOpenSlotsOnly(event.target.checked)}
          />
          Open slots only
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }}>
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(event) => setSavedOnly(event.target.checked)}
            data-testid="trial-browse-saved-only"
          />
          Saved only ({savedTrialIds.length})
        </label>
      </div>

      <div className={ui.inputRow} style={{ marginTop: "0.75rem", alignItems: "end" }}>
        <label style={{ flex: 1 }}>
          Card for this check
          <select
            className={ui.input}
            value={selectedCredentialId}
            onChange={(event) => setSelectedCredentialId(event.target.value)}
            disabled={storedCredentials.length === 0}
            data-testid="trial-browse-credential-select"
          >
            {storedCredentials.length === 0 ? (
              <option value="">No cards on this device</option>
            ) : (
              storedCredentials.map((credential) => (
                <option key={credential.credentialId} value={credential.credentialId}>
                  Card ···{credential.credentialId.slice(-4)} ({credential.requestCode})
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          className={ui.btn}
          data-testid="btn-refresh-trials-browse"
          onClick={() => void refreshState()}
        >
          Refresh on-chain trials
        </button>
      </div>

      {fetchError && (
        <p className={ui.msgError} role="alert">
          Can’t load the trial list ({fetchError}). Start the verification API if you’re running locally.
        </p>
      )}
      {actionError && (
        <p className={ui.msgError} role="alert" data-testid="trial-browse-error">
          {actionError}
        </p>
      )}
      {filteredTrials.length === 0 && !fetchError && (
        <p className={ui.msgMuted} data-testid="trial-browse-empty">
          {savedOnly && savedTrialIds.length === 0
            ? "You haven’t saved any trials yet — tap the star on a trial to bookmark it on this device."
            : "No trials matched the current filters."}
        </p>
      )}

      <ul className={ui.list}>
        {filteredTrials.map((trial) => {
          const chain = chainById.get(trial.trialIdHex.toLowerCase());
          const names: Record<string, string> = {};
          const allCodes = [...trial.criteria.inclusionIcd10, ...trial.criteria.exclusionIcd10];
          for (const code of allCodes) {
            const match = DEMO_ICD10_CODES.find((item) => item.code === code);
            names[code] = match?.name ?? code;
          }
          const lines = formatCriteriaPlainLanguage(trial.criteria, names);
          const activeEvaluation =
            evaluationState?.trialIdHex === trial.trialIdHex ? evaluationState : null;
          const disclosureOpen = disclosureOpenForTrialId === trial.trialIdHex;
          const isSaved = savedTrialIds.includes(trial.trialIdHex.toLowerCase());
          const urgency = chain ? deadlineUrgency(Number(chain.deadline)) : null;

          return (
            <li
              key={trial.trialIdHex}
              style={{
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--zk-border)",
                paddingBottom: "1rem"
              }}
            >
              <div className="zk-trial-head">
                <p style={{ fontWeight: 700, margin: "0 0 0.35rem" }}>{trial.criteria.title}</p>
                <button
                  type="button"
                  className="zk-star"
                  aria-pressed={isSaved}
                  aria-label={isSaved ? "Remove from saved trials" : "Save trial"}
                  title={isSaved ? "Saved on this device — click to remove" : "Save on this device"}
                  onClick={() => handleToggleSaved(trial.trialIdHex)}
                  data-testid={`btn-save-${trial.trialIdHex.slice(0, 8)}`}
                >
                  {isSaved ? "★" : "☆"}
                </button>
              </div>
              {lines.slice(1).map((line, index) => (
                <p key={index} className={ui.msgMuted} style={{ fontSize: "0.875rem", margin: "0.2rem 0" }}>
                  {line}
                </p>
              ))}
              {chain ? (
                <p className={ui.msg} style={{ marginTop: "0.5rem" }}>
                  On-chain: slots {chain.slotsFilled.toString()}/{chain.slotsTotal.toString()} ·{" "}
                  {TRIAL_STATUS[chain.status] ?? chain.status} · deadline{" "}
                  {new Date(Number(chain.deadline)).toLocaleString()}
                </p>
              ) : (
                <p className={ui.warnInline} style={{ marginTop: "0.5rem" }}>
                  Not found on this contract (join the contract that created this trial).
                </p>
              )}
              {chain && urgency ? (
                <div className="zk-trial-meta" data-testid={`trial-meta-${trial.trialIdHex.slice(0, 8)}`}>
                  <span className={`zk-badge zk-badge--${urgency.tone}`}>{urgency.label}</span>
                  <div
                    className="zk-meter"
                    role="progressbar"
                    aria-label="Enrollment slots filled"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={slotsFillPercent(chain.slotsFilled, chain.slotsTotal)}
                  >
                    <div
                      className="zk-meter-fill"
                      style={{ width: `${slotsFillPercent(chain.slotsFilled, chain.slotsTotal)}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className={ui.inputRow} style={{ marginTop: "0.75rem", alignItems: "center" }}>
                <button
                  type="button"
                  className={ui.btnPrimary}
                  onClick={() => void handleEvaluateTrial(trial)}
                  disabled={storedCredentials.length === 0}
                  data-testid={`btn-evaluate-${trial.trialIdHex.slice(0, 8)}`}
                >
                  Evaluate locally
                </button>
                {activeEvaluation?.evaluation.eligible && !activeEvaluation.blockedReason ? (
                  <button
                    type="button"
                    className={ui.btn}
                    onClick={() => handleOpenDisclosure(trial)}
                    disabled={postingTrialId === trial.trialIdHex}
                    data-testid={`btn-disclosure-${trial.trialIdHex.slice(0, 8)}`}
                  >
                    {disclosureOpen ? "Disclosure (see below)" : "Create proof ID"}
                  </button>
                ) : null}
              </div>

              {activeEvaluation && (
                <div className={ui.highlight} style={{ marginTop: "0.75rem" }}>
                  <p className={ui.highlightLabel}>Eligibility result</p>
                  <p className={ui.msg} style={{ marginTop: 4 }}>
                    Match score <strong>{activeEvaluation.evaluation.matchPercent}%</strong> (need ≥{" "}
                    {activeEvaluation.evaluation.thresholdPercent}%) ·{" "}
                    {activeEvaluation.evaluation.eligible ? "Eligible" : "Not eligible"}
                    {activeEvaluation.evaluation.blockedByExclusion ? " (exclusion rule failed)" : ""} · trial
                    pseudonym <code className={ui.code}>{activeEvaluation.pseudonym}</code>
                  </p>
                  {activeEvaluation.blockedReason ? (
                    <p className={ui.warnInline} style={{ marginTop: 6 }}>
                      {activeEvaluation.blockedReason}
                    </p>
                  ) : null}
                  <ul className={ui.list} style={{ marginTop: "0.5rem" }}>
                    {activeEvaluation.evaluation.criterionResults.map((criterion) => (
                      <li key={criterion.key}>
                        <strong>{criterion.passed ? "PASS" : "FAIL"}</strong> — {criterion.label}: {criterion.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {disclosureOpen && activeEvaluation?.evaluation.eligible && !activeEvaluation.blockedReason && (
                <div
                  className="zk-disclosure-panel"
                  data-testid="disclosure-panel"
                  style={{ marginTop: "0.75rem", padding: "1rem", border: "2px solid var(--zk-border)" }}
                >
                  <p className={ui.sectionTitle} style={{ marginBottom: "0.5rem" }}>
                    Before we post anything
                  </p>
                  <DisclosureSummary />
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      marginTop: "0.75rem",
                      fontSize: "0.875rem",
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={disclosureAccepted}
                      onChange={(e) => setDisclosureAccepted(e.target.checked)}
                      data-testid="disclosure-accept-checkbox"
                    />
                    <span>
                      I understand only pass/fail per rule and my proof ID will be shared — not my diagnosis, labs,
                      medications, or identity.
                    </span>
                  </label>
                  <div className={ui.inputRow} style={{ marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      className={ui.btnPrimary}
                      onClick={() => void handleCreateProof(trial)}
                      disabled={postingTrialId === trial.trialIdHex || !disclosureAccepted}
                      data-testid="btn-confirm-proof"
                    >
                      {postingTrialId === trial.trialIdHex ? "Posting proof…" : "Confirm & post proof ID"}
                    </button>
                    <button
                      type="button"
                      className={ui.btn}
                      onClick={() => {
                        setDisclosureOpenForTrialId(null);
                        setDisclosureAccepted(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
