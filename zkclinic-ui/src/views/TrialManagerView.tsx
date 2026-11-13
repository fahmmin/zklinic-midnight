import { useState, useCallback, useEffect } from "react";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { createCredentialId } from "../credential";
import {
  type LabCriterion,
  type LabOperator,
  type TrialCriteriaV1,
  criteriaHashHex,
  eligibilityPercentToBps,
  validateTrialCriteriaShape,
  stableStringify,
  trialCriteriaWireForm
} from "../trialCriteria";
import { searchICD10, DEMO_ICD10_CODES, type ICD10Entry } from "../icd10";
import { icd11TextToCodes, type Icd11Candidate } from "../lib/icd11Api";
import { criteriaFromTrial } from "zkclinic-contract";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { Steps } from "../components/Steps";
import { ui } from "../ui";
import {
  demoTrialDeadlineLocal,
  DEMO_TRIAL_ASSIST_PROMPT,
  DEMO_TRIAL_EXCLUSION_ICD10,
  DEMO_TRIAL_EXCLUSION_MEDS,
  DEMO_TRIAL_INCLUSION_ICD10,
  DEMO_TRIAL_SHORT_DESCRIPTION,
  DEMO_TRIAL_TITLE
} from "../lib/demoWorkspaceMocks";

const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

/** When set, skip `/trials/validate` and `POST /trials` — only Midnight `createTrial` runs (criteria hash is still computed locally). */
const SKIP_TRIAL_METADATA_API =
  import.meta.env.VITE_SKIP_TRIAL_METADATA_API === "1" ||
  import.meta.env.VITE_SKIP_TRIAL_METADATA_API === "true";

const LAB_OPS: LabCriterion["operator"][] = ["=", "<", ">", "<=", ">="];

const emptyLab = (): LabCriterion => ({
  testName: "",
  operator: ">=",
  threshold: 0,
  unit: ""
});

export function TrialManagerView() {
  const {
    createTrial,
    closeTrial,
    recordEnrollment,
    publishTrialCriteria,
    state,
    flowMessage,
    status,
    walletDoctorKeyHex
  } = useZKClinic();

  const [title, setTitle] = useState(DEMO_TRIAL_TITLE);
  const [shortDescription, setShortDescription] = useState(DEMO_TRIAL_SHORT_DESCRIPTION);
  const [inclusionCodes, setInclusionCodes] = useState<string[]>(() => [...DEMO_TRIAL_INCLUSION_ICD10]);
  const [exclusionCodes, setExclusionCodes] = useState<string[]>(() => [...DEMO_TRIAL_EXCLUSION_ICD10]);
  const [inclusionIcd11, setInclusionIcd11] = useState<string[]>([]);
  const [exclusionIcd11, setExclusionIcd11] = useState<string[]>([]);
  const [icd10Input, setIcd10Input] = useState("");
  const [icd10ExInput, setIcd10ExInput] = useState("");
  const [icd11IncInput, setIcd11IncInput] = useState("");
  const [icd11ExcInput, setIcd11ExcInput] = useState("");
  const [icd10Suggestions, setIcd10Suggestions] = useState<ICD10Entry[]>([]);
  const [icd10ExSuggestions, setIcd10ExSuggestions] = useState<ICD10Entry[]>([]);
  const [icd11IncSug, setIcd11IncSug] = useState<Icd11Candidate[]>([]);
  const [icd11ExcSug, setIcd11ExcSug] = useState<Icd11Candidate[]>([]);
  const [exclusionMeds, setExclusionMeds] = useState(DEMO_TRIAL_EXCLUSION_MEDS);
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [labRows, setLabRows] = useState<LabCriterion[]>([]);
  const [slotsTotal, setSlotsTotal] = useState("20");
  const [deadlineLocal, setDeadlineLocal] = useState(() => demoTrialDeadlineLocal());
  /** Minimum match % on non-exclusion criteria (default 75). Committed on-chain as basis points. */
  const [eligibilityThresholdPercent, setEligibilityThresholdPercent] = useState("75");
  const [trialActionId, setTrialActionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [trialAssistPrompt, setTrialAssistPrompt] = useState(DEMO_TRIAL_ASSIST_PROMPT);
  const [trialAssistBusy, setTrialAssistBusy] = useState(false);
  const [validatePreview, setValidatePreview] = useState<string | null>(null);
  const [managerProofs, setManagerProofs] = useState<
    Array<{
      proofId: string;
      trialIdHex: string;
      trialTitle: string;
      pseudonym: string;
      eligible: boolean;
      matchPercent?: number;
      thresholdPercent?: number;
      createdAt: number;
    }>
  >([]);
  const [proofsFetchError, setProofsFetchError] = useState<string | null>(null);

  const isDeployed = status === "deployed";

  const searchIcd10Cb = useCallback(async (q: string, setSug: (v: ICD10Entry[]) => void) => {
    if (!q.trim()) {
      setSug(DEMO_ICD10_CODES);
      return;
    }
    try {
      const results = await searchICD10(q, 12);
      setSug(results.length > 0 ? results : DEMO_ICD10_CODES);
    } catch {
      setSug(DEMO_ICD10_CODES);
    }
  }, []);

  useEffect(() => {
    searchIcd10Cb(icd10Input, setIcd10Suggestions);
  }, [icd10Input, searchIcd10Cb]);

  useEffect(() => {
    searchIcd10Cb(icd10ExInput, setIcd10ExSuggestions);
  }, [icd10ExInput, searchIcd10Cb]);

  const searchIcd11 = useCallback(async (q: string, setSug: (v: Icd11Candidate[]) => void) => {
    if (!q.trim()) {
      setSug([]);
      return;
    }
    try {
      const { candidates } = await icd11TextToCodes(q);
      setSug(candidates);
    } catch {
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

  const addInclusion = (e: ICD10Entry) => {
    if (!inclusionCodes.includes(e.code)) setInclusionCodes([...inclusionCodes, e.code]);
    setIcd10Input("");
  };

  const addExclusion = (e: ICD10Entry) => {
    if (!exclusionCodes.includes(e.code)) setExclusionCodes([...exclusionCodes, e.code]);
    setIcd10ExInput("");
  };

  const addIcd11Inc = (c: Icd11Candidate) => {
    const code = c.code.trim().toUpperCase();
    if (code && !inclusionIcd11.includes(code)) setInclusionIcd11([...inclusionIcd11, code]);
    setIcd11IncInput("");
  };

  const addIcd11Exc = (c: Icd11Candidate) => {
    const code = c.code.trim().toUpperCase();
    if (code && !exclusionIcd11.includes(code)) setExclusionIcd11([...exclusionIcd11, code]);
    setIcd11ExcInput("");
  };

  const mergeTrialAssistantPartial = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const p = raw as Record<string, unknown>;
    if (typeof p.title === "string" && p.title.trim()) setTitle(p.title.trim());
    if (typeof p.shortDescription === "string") setShortDescription(p.shortDescription);
    if (Array.isArray(p.inclusionIcd10)) {
      const codes = p.inclusionIcd10.filter((c): c is string => typeof c === "string").map((c) => c.trim().toUpperCase());
      if (codes.length) setInclusionCodes((prev) => Array.from(new Set([...prev, ...codes])));
    }
    if (Array.isArray(p.exclusionIcd10)) {
      const codes = p.exclusionIcd10.filter((c): c is string => typeof c === "string").map((c) => c.trim().toUpperCase());
      if (codes.length) setExclusionCodes((prev) => Array.from(new Set([...prev, ...codes])));
    }
    if (Array.isArray(p.inclusionIcd11)) {
      const codes = p.inclusionIcd11
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim().toUpperCase());
      if (codes.length) setInclusionIcd11((prev) => Array.from(new Set([...prev, ...codes])));
    }
    if (Array.isArray(p.exclusionIcd11)) {
      const codes = p.exclusionIcd11
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim().toUpperCase());
      if (codes.length) setExclusionIcd11((prev) => Array.from(new Set([...prev, ...codes])));
    }
    if (Array.isArray(p.exclusionMedications)) {
      const meds = p.exclusionMedications.filter((m): m is string => typeof m === "string").join(", ");
      if (meds) setExclusionMeds((prev) => (prev.trim() ? `${prev.trim()}, ${meds}` : meds));
    }
    if (typeof p.ageMin === "number" && Number.isFinite(p.ageMin)) setAgeMin(String(Math.round(p.ageMin)));
    if (typeof p.ageMax === "number" && Number.isFinite(p.ageMax)) setAgeMax(String(Math.round(p.ageMax)));
    if (typeof p.eligibilityThresholdPercent === "number" && Number.isFinite(p.eligibilityThresholdPercent)) {
      setEligibilityThresholdPercent(String(Math.round(p.eligibilityThresholdPercent)));
    }
    if (Array.isArray(p.labCriteria)) {
      const ops = new Set(["<", ">", "<=", ">=", "="]);
      const labs: LabCriterion[] = p.labCriteria
        .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
        .map((row) => {
          const opRaw = row.operator;
          const operator: LabOperator =
            typeof opRaw === "string" && ops.has(opRaw) ? (opRaw as LabOperator) : ">=";
          return {
            testName: typeof row.testName === "string" ? row.testName : "",
            operator,
            threshold: typeof row.threshold === "number" && Number.isFinite(row.threshold) ? row.threshold : 0,
            unit: typeof row.unit === "string" ? row.unit : ""
          };
        })
        .filter((r) => r.testName.trim());
      if (labs.length) setLabRows(labs);
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
      const j = (await res.json()) as { partial?: unknown; error?: string };
      if (!res.ok) throw new Error(j.error ?? `Assistant failed (${res.status})`);
      mergeTrialAssistantPartial(j.partial);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrialAssistBusy(false);
    }
  };

  const buildCriteria = (trialId: string): TrialCriteriaV1 => {
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
    setValidatePreview(
      `Wire JSON (hashed, first 200 chars): ${stableStringify(trialCriteriaWireForm(criteria)).slice(0, 200)}…`
    );

    if (!SKIP_TRIAL_METADATA_API) {
      const valRes = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/trials/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria })
      });
      const valText = await valRes.text();
      let valJson: { ok?: boolean; errors?: string[]; error?: string; details?: string[] } = {};
      try {
        valJson = valText ? (JSON.parse(valText) as typeof valJson) : {};
      } catch {
        setError(
          `Validation request failed (HTTP ${valRes.status}): ${valText.trim().slice(0, 400) || "empty or non-JSON response"}`
        );
        return;
      }
      if (!valRes.ok || !valJson.ok) {
        const reasons = [
          ...(Array.isArray(valJson.errors) ? valJson.errors : []),
          ...(Array.isArray(valJson.details) ? valJson.details : []),
          ...(valJson.error ? [valJson.error] : [])
        ];
        setError(
          reasons.length
            ? reasons.join("; ")
            : `Validation failed (HTTP ${valRes.status}). Check the verification API logs and VITE_VERIFICATION_API_URL.`
        );
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
          const payload = JSON.parse(text) as { error?: string; details?: string[] };
          const details = [...(payload.error ? [payload.error] : []), ...(payload.details ?? [])];
          setError(`Metadata API ${postMeta.status}: ${details.join("; ") || text}`);
        } catch {
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
    // Build the circuit criteria first so an un-provable trial fails before any transaction.
    const zkCriteria = criteriaFromTrial(criteria);
    await createTrial(trialId, slots, deadlineMs, hashHex, thresholdBps);
    await publishTrialCriteria(trialId, zkCriteria);
    setStep(1);
  };

  const myTrials =
    state?.trials?.filter(
      (t) => walletDoctorKeyHex && t.manager === walletDoctorKeyHex.toLowerCase()
    ) ?? [];

  const refreshManagerProofs = useCallback(async () => {
    if (!walletDoctorKeyHex) return;
    setProofsFetchError(null);
    try {
      const res = await fetch(
        `${VERIFICATION_API_URL.replace(/\/$/, "")}/proofs?managerPubKeyHex=${encodeURIComponent(walletDoctorKeyHex)}`
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        proofs?: Array<{
          proofId: string;
          trialIdHex: string;
          trialTitle: string;
          pseudonym: string;
          eligible: boolean;
          matchPercent?: number;
          thresholdPercent?: number;
          createdAt: number;
        }>;
      };
      setManagerProofs(data.proofs ?? []);
    } catch (e) {
      setManagerProofs([]);
      setProofsFetchError(e instanceof Error ? e.message : String(e));
    }
  }, [walletDoctorKeyHex]);

  useEffect(() => {
    if (!isDeployed || !walletDoctorKeyHex) return;
    void refreshManagerProofs();
  }, [isDeployed, walletDoctorKeyHex, state?.trials?.length, refreshManagerProofs]);

  const TRIAL_STATUS = ["Open", "Closed", "Full"];

  return (
    <section className={ui.section} data-testid="trial-manager-view">
      <div className={ui.sectionInner}>
        <h2 className={ui.h2}>Run a study</h2>
        {SKIP_TRIAL_METADATA_API && (
          <p className={ui.msgMuted} role="status" data-testid="trial-skip-metadata-api">
            <strong>Midnight-first mode:</strong> <code className={ui.code}>VITE_SKIP_TRIAL_METADATA_API</code> is on —
            the verification API will not store trial metadata (browse/proof flows that read{" "}
            <code className={ui.code}>GET /trials</code> will not list this trial until you post it separately). The
            on-chain <code className={ui.code}>criteriaHash</code> still matches the locally canonical JSON.
          </p>
        )}

        {flowMessage && <p className={ui.msgFlow}>{flowMessage}</p>}
        {error && (
          <p className={ui.msgError} role="alert">
            {error}
          </p>
        )}

        {!isDeployed && (
          <p className={ui.msgMuted} data-testid="trial-manager-gate">
            Tap <strong>Connect wallet</strong> above to start.
          </p>
        )}

        {isDeployed && (
          <Steps labels={["Create a study", "My studies", "People who qualify"]} step={step} onStep={setStep}>
            <div>
            <h3 className={ui.h2}>Create a study</h3>
            <p className={ui.lead}>Example values are filled in. Change what you need, then publish.</p>

            <div className={ui.field}>
              <label className={ui.fieldLabel} htmlFor="trial-title-input">
                Title
              </label>
              <input
                id="trial-title-input"
                className={ui.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-trial-title"
                placeholder="e.g. T2DM adjunct therapy"
                autoComplete="off"
              />
            </div>

            <div className={ui.field}>
              <label className={ui.fieldLabel} htmlFor="trial-short-desc">
                Short description
              </label>
              <textarea
                id="trial-short-desc"
                className={ui.input}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary for your team (inclusion / exclusion in plain language)…"
                rows={4}
              />
            </div>

            <details className="zk-explain">
              <summary>Fill the form from a description (AI)</summary>
            <div className={ui.field}>
              <label className={ui.fieldLabel} htmlFor="trial-assist-prompt">
                One-shot assistant (Gemini)
              </label>
              <p className={ui.fieldHint} id="trial-assist-hint">
                Runs on the verification API. Describe the trial in natural language; criteria fields below merge in.
                Review everything before posting.
              </p>
              <textarea
                id="trial-assist-prompt"
                className={ui.input}
                aria-describedby="trial-assist-hint"
                placeholder="e.g. Phase 2 diabetes study, ages 30–70, HbA1c under 8%, exclude insulin users…"
                value={trialAssistPrompt}
                onChange={(e) => setTrialAssistPrompt(e.target.value)}
                data-testid="trial-assist-prompt"
                rows={5}
              />
              <button
                type="button"
                className={ui.btnPrimary}
                style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}
                data-testid="btn-trial-assist"
                disabled={trialAssistBusy}
                onClick={() => void runTrialAssistant()}
              >
                {trialAssistBusy ? "Filling…" : "Fill the form from my description"}
              </button>
            </div>
            </details>

            <p className={ui.sectionTitle} style={{ marginTop: "1rem" }}>
              Inclusion ICD-10
            </p>
            <div className={ui.inputRow}>
              <input
                className={ui.input}
                placeholder="Search ICD-10-CM"
                value={icd10Input}
                onChange={(e) => setIcd10Input(e.target.value)}
              />
            </div>
            <ul className={ui.list} style={{ maxHeight: 140, overflow: "auto" }}>
              {icd10Suggestions.map((s) => (
                <li key={s.code}>
                  <button type="button" className={ui.btn} onClick={() => addInclusion(s)}>
                    + {s.code} — {s.name}
                  </button>
                </li>
              ))}
            </ul>
            <p className={ui.msgMuted}>Selected: {inclusionCodes.join(", ") || "—"}</p>

            <details className="zk-explain">
              <summary>Who cannot join, and ICD-11 codes (optional)</summary>
            <p className={ui.sectionTitle} style={{ marginTop: "1rem" }}>
              Exclusion ICD-10
            </p>
            <div className={ui.inputRow}>
              <input
                className={ui.input}
                placeholder="Search exclusions"
                value={icd10ExInput}
                onChange={(e) => setIcd10ExInput(e.target.value)}
              />
            </div>
            <ul className={ui.list} style={{ maxHeight: 120, overflow: "auto" }}>
              {icd10ExSuggestions.map((s) => (
                <li key={`ex-${s.code}`}>
                  <button type="button" className={ui.btn} onClick={() => addExclusion(s)}>
                    + {s.code}
                  </button>
                </li>
              ))}
            </ul>
            <p className={ui.msgMuted}>{exclusionCodes.join(", ") || "—"}</p>

            <p className={ui.sectionTitle} style={{ marginTop: "1rem" }}>
              Inclusion ICD-11 (optional)
            </p>
            <input
              className={ui.input}
              placeholder="Plain language — e.g. type 2 diabetes mellitus"
              value={icd11IncInput}
              onChange={(e) => setIcd11IncInput(e.target.value)}
              data-testid="input-trial-icd11-inc"
            />
            <ul className={ui.list} style={{ maxHeight: 120, overflow: "auto" }}>
              {icd11IncSug.map((s) => (
                <li key={`i11-${s.code}`}>
                  <button type="button" className={ui.btn} onClick={() => addIcd11Inc(s)}>
                    + {s.code} — {s.title}
                  </button>
                </li>
              ))}
            </ul>
            <p className={ui.msgMuted}>Selected ICD-11: {inclusionIcd11.join(", ") || "—"}</p>

            <p className={ui.sectionTitle} style={{ marginTop: "1rem" }}>
              Exclusion ICD-11 (optional)
            </p>
            <input
              className={ui.input}
              placeholder="Search ICD-11 for exclusions"
              value={icd11ExcInput}
              onChange={(e) => setIcd11ExcInput(e.target.value)}
            />
            <ul className={ui.list} style={{ maxHeight: 100, overflow: "auto" }}>
              {icd11ExcSug.map((s) => (
                <li key={`e11-${s.code}`}>
                  <button type="button" className={ui.btn} onClick={() => addIcd11Exc(s)}>
                    + {s.code}
                  </button>
                </li>
              ))}
            </ul>
            <p className={ui.msgMuted}>{exclusionIcd11.join(", ") || "—"}</p>

            <div className={ui.field}>
              <label className={ui.fieldLabel} htmlFor="trial-exclusion-meds">
                Exclusion medications (comma-separated)
              </label>
              <input
                id="trial-exclusion-meds"
                className={ui.input}
                value={exclusionMeds}
                onChange={(e) => setExclusionMeds(e.target.value)}
                placeholder="e.g. warfarin, metformin"
              />
            </div>
            </details>

            <div className={ui.fieldRow}>
              <div className={ui.field}>
                <label className={ui.fieldLabel} htmlFor="trial-age-min">
                  Age min
                </label>
                <input
                  id="trial-age-min"
                  className={ui.input}
                  type="number"
                  min={0}
                  max={120}
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                />
              </div>
              <div className={ui.field}>
                <label className={ui.fieldLabel} htmlFor="trial-age-max">
                  Age max
                </label>
                <input
                  id="trial-age-max"
                  className={ui.input}
                  type="number"
                  min={0}
                  max={120}
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                />
              </div>
            </div>

            <p className={ui.sectionTitle} style={{ marginTop: "1rem" }}>
              Lab criteria (optional)
            </p>
            {labRows.map((row, i) => (
              <div key={i} className={ui.inputRow} style={{ flexWrap: "wrap", gap: 8 }}>
                <input
                  className={ui.input}
                  placeholder="Test name e.g. HbA1c"
                  value={row.testName}
                  onChange={(e) => {
                    const next = [...labRows];
                    next[i] = { ...row, testName: e.target.value };
                    setLabRows(next);
                  }}
                />
                <select
                  className={ui.input}
                  value={row.operator}
                  onChange={(e) => {
                    const next = [...labRows];
                    next[i] = { ...row, operator: e.target.value as LabCriterion["operator"] };
                    setLabRows(next);
                  }}
                >
                  {LAB_OPS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <input
                  className={ui.input}
                  type="number"
                  placeholder="Threshold"
                  value={row.threshold}
                  onChange={(e) => {
                    const next = [...labRows];
                    next[i] = { ...row, threshold: Number(e.target.value) };
                    setLabRows(next);
                  }}
                />
                <input
                  className={ui.input}
                  placeholder="Unit e.g. %"
                  value={row.unit}
                  onChange={(e) => {
                    const next = [...labRows];
                    next[i] = { ...row, unit: e.target.value };
                    setLabRows(next);
                  }}
                />
                <button
                  type="button"
                  className={ui.btn}
                  onClick={() => setLabRows(labRows.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className={ui.btn} onClick={() => setLabRows([...labRows, emptyLab()])}>
              + Lab row
            </button>

            <details className="zk-explain">
              <summary>Advanced: match score</summary>
            <div className={ui.field}>
              <label className={ui.fieldLabel} htmlFor="trial-match-threshold">
                Minimum match score (%)
              </label>
              <input
                id="trial-match-threshold"
                className={ui.input}
                style={{ maxWidth: "10rem" }}
                type="number"
                min={1}
                max={100}
                value={eligibilityThresholdPercent}
                onChange={(e) => setEligibilityThresholdPercent(e.target.value)}
                data-testid="input-trial-match-threshold"
              />
              <p className={ui.fieldHint}>
                Patients need at least this score on non-exclusion criteria (exclusions still block). Default 75%.
                Stored on-chain as basis points and in trial metadata hash.
              </p>
            </div>
            </details>

            <div className={ui.fieldRow}>
              <div className={ui.field}>
                <label className={ui.fieldLabel} htmlFor="trial-slots-total">
                  Places
                </label>
                <input
                  id="trial-slots-total"
                  className={ui.input}
                  type="number"
                  min={1}
                  value={slotsTotal}
                  onChange={(e) => setSlotsTotal(e.target.value)}
                  data-testid="input-trial-slots"
                />
              </div>
              <div className={ui.field}>
                <label className={ui.fieldLabel} htmlFor="trial-deadline-local">
                  Closes on
                </label>
                <input
                  id="trial-deadline-local"
                  className={ui.input}
                  type="datetime-local"
                  value={deadlineLocal}
                  onChange={(e) => setDeadlineLocal(e.target.value)}
                  data-testid="input-trial-deadline"
                />
              </div>
            </div>

            {validatePreview && (
              <p className={ui.msgMuted} style={{ fontSize: "0.75rem" }}>
                {validatePreview}
              </p>
            )}

            <button
              type="button"
              className={ui.btnPrimary}
              style={{ marginTop: "0.75rem" }}
              data-testid="btn-post-trial"
              onClick={() => void handlePostTrial()}
            >
              Publish study
            </button>

            </div>

            <div>
            <h3 className={ui.h2}>My studies</h3>
            <div className={ui.field}>
              <label className={ui.fieldLabel} htmlFor="trial-id-action">
                Trial id (64 hex)
              </label>
              <input
                id="trial-id-action"
                className={ui.inputMono}
                placeholder="64-character hex trial identifier"
                value={trialActionId}
                onChange={(e) => setTrialActionId(e.target.value.trim().toLowerCase())}
                data-testid="input-trial-id-action"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className={ui.inputRow} style={{ marginTop: 8 }}>
              <button
                type="button"
                className={ui.btn}
                data-testid="btn-close-trial"
                onClick={() => trialActionId && void closeTrial(trialActionId).catch((e) => setError(String(e)))}
                disabled={!trialActionId || trialActionId.length !== 64}
              >
                Close trial
              </button>
            </div>

            {myTrials.length > 0 && (
              <ul className={ui.list} data-testid="trial-manager-my-list">
                {myTrials.map((t) => (
                  <li key={t.trialId}>
                    <code className={ui.code}>{t.trialId.slice(0, 16)}…</code> — slots {t.slotsFilled.toString()}/
                    {t.slotsTotal.toString()} — {TRIAL_STATUS[t.status] ?? t.status} — min match ≥{" "}
                    {(Number(t.eligibilityThresholdBps) / 100).toFixed(0)}%
                  </li>
                ))}
              </ul>
            )}

            </div>

            <div>
            <h3 className={ui.h2}>People who qualify</h3>
            <p className={ui.lead}>
              Each row is a code name, not a person. <strong>Verified on Midnight</strong> means the network checked
              their proof against your rules. You never see their diagnosis, test results or age.
            </p>
            {proofsFetchError && (
              <p className={ui.msgMuted} role="status">
                Could not load proofs ({proofsFetchError}).
              </p>
            )}
            <button type="button" className={ui.btn} onClick={() => void refreshManagerProofs()}>
              Refresh proof list
            </button>
            {managerProofs.length > 0 ? (
              <table
                className={ui.input}
                style={{ marginTop: "0.75rem", width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
                data-testid="trial-manager-proofs-table"
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.35rem" }}>Trial</th>
                    <th style={{ textAlign: "left", padding: "0.35rem" }}>Match %</th>
                    <th style={{ textAlign: "left", padding: "0.35rem" }}>Threshold %</th>
                    <th style={{ textAlign: "left", padding: "0.35rem" }}>Eligible</th>
                    <th style={{ textAlign: "left", padding: "0.35rem" }}>Proof ID</th>
                    <th style={{ textAlign: "left", padding: "0.35rem" }}>On-chain</th>
                    <th style={{ textAlign: "left", padding: "0.35rem" }} />
                  </tr>
                </thead>
                <tbody>
                  {managerProofs.map((p) => (
                    <tr key={p.proofId}>
                      <td style={{ padding: "0.35rem" }}>{p.trialTitle}</td>
                      <td style={{ padding: "0.35rem" }}>
                        {p.matchPercent != null ? `${p.matchPercent}%` : "—"}
                      </td>
                      <td style={{ padding: "0.35rem" }}>
                        {p.thresholdPercent != null ? `${p.thresholdPercent}%` : "—"}
                      </td>
                      <td style={{ padding: "0.35rem" }}>{p.eligible ? "yes" : "no"}</td>
                      <td style={{ padding: "0.35rem" }}>
                        <code className={ui.code}>{p.proofId}</code>
                      </td>
                      {(() => {
                        const nul = p.pseudonym.toLowerCase();
                        const verified = state?.eligibilityProofs[nul] === p.trialIdHex.toLowerCase();
                        const enrolled = !!state?.enrolledProofs.includes(nul);
                        return (
                          <>
                            <td style={{ padding: "0.35rem" }} data-testid="proof-onchain-status">
                              {enrolled ? "Enrolled" : verified ? "Verified on Midnight" : "Not on-chain"}
                            </td>
                            <td style={{ padding: "0.35rem" }}>
                              <button
                                type="button"
                                className={ui.btnPrimary}
                                data-testid="btn-record-enrollment"
                                disabled={!verified || enrolled}
                                onClick={() =>
                                  void recordEnrollment(p.trialIdHex, nul).catch((e) =>
                                    setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)))
                                  )
                                }
                              >
                                Enroll
                              </button>
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !proofsFetchError && (
                <p className={ui.msgMuted} style={{ marginTop: "0.5rem" }}>
                  Nobody has qualified yet. Rows appear here when a patient proves they fit.
                </p>
              )
            )}
            </div>
          </Steps>
        )}
      </div>
    </section>
  );
}
