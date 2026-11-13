import { useState, useEffect, useCallback } from "react";
import { useZKClinic } from "../contexts/ZKClinicContext";
import {
  createCredentialPayload,
  createCredentialPayloadContinuingCard,
  encryptCredential,
  diagnosisVisitCommitment,
  randomVisitNonceHex,
  type PatientIntakeV1
} from "../credential";
import { searchICD10, DEMO_ICD10_CODES, type ICD10Entry } from "../icd10";
import { parseMedicationText } from "../lib/parseMedicationText";
import { icd11CodeToText, icd11TextToCodes, type Icd11Candidate } from "../lib/icd11Api";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import {
  DEMO_CERTIFICATE_OCR_TEXT,
  DEMO_DOCTOR_ICD10_CODES,
  DEMO_DOCTOR_MEDICATIONS_BLOCK,
  DEMO_IMR_RECORD_TEXT,
  DEMO_NMC_DOCTOR_ID,
  DEMO_NMC_REGISTRATION_NO,
  DEMO_OCR_NAME_HINT,
  DEMO_OCR_SMC_HINT
} from "../lib/demoWorkspaceMocks";
import { attributesFromCredential, attributesToJson, ZKClinic } from "zkclinic-contract";
import { fromHex, toHex } from "../lib/zkIdentity";
import { Steps } from "../components/Steps";
import { ui } from "../ui";

/** "HbA1c 8.2 %" / "eGFR: 74" / "LDL=130 mg/dL", one per line. */
export function parseLabText(text: string): { testName: string; value: number; unit: string }[] {
  return text
    .split(/[\n,]/)
    .map((line) => line.trim().match(/^(.+?)[\s:=]+(-?\d+(?:\.\d+)?)\s*(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ testName: m[1].trim(), value: Number(m[2]), unit: m[3].trim() }));
}

const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

export function DoctorView() {
  const {
    fetchCredentialRequest,
    deliverCredential,
    registerCredential,
    appendDiagnosisToCredential,
    issueCredentialCommitment,
    revokeCredential,
    submitRequest,
    approveIssuer,
    state,
    flowMessage,
    status,
    walletDoctorKeyHex
  } = useZKClinic();

  const [requestCode, setRequestCode] = useState(
    () => localStorage.getItem("zkclinic-last-request-code") ?? ""
  );
  const [requestInfo, setRequestInfo] = useState<{
    requestId: string;
    hasCredential: boolean;
    patientIntake?: PatientIntakeV1;
    hasPatientIntake?: boolean;
    continuingCredentialId?: string;
    hasContinuingCredentialId?: boolean;
  } | null>(null);
  const [icd10Input, setIcd10Input] = useState("");
  const [icd10Suggestions, setIcd10Suggestions] = useState<ICD10Entry[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() => [...DEMO_DOCTOR_ICD10_CODES]);
  const [icd11Input, setIcd11Input] = useState("");
  const [icd11Suggestions, setIcd11Suggestions] = useState<Icd11Candidate[]>([]);
  const [selectedIcd11, setSelectedIcd11] = useState<string[]>([]);
  const [icd11Warnings, setIcd11Warnings] = useState<string[]>([]);
  const [credentialToRevoke, setCredentialToRevoke] = useState("");
  const [medicationsText, setMedicationsText] = useState(DEMO_DOCTOR_MEDICATIONS_BLOCK);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [ageText, setAgeText] = useState("52");
  const [labsText, setLabsText] = useState("HbA1c 8.2 %\neGFR 74");

  // Doctor self-registration state
  const [regName, setRegName] = useState(DEMO_OCR_NAME_HINT);
  const [regDoctorId, setRegDoctorId] = useState(DEMO_NMC_DOCTOR_ID);
  const [regRegNo, setRegRegNo] = useState(DEMO_NMC_REGISTRATION_NO);
  const [regCouncil, setRegCouncil] = useState(DEMO_OCR_SMC_HINT);
  const [regImrText, setRegImrText] = useState(DEMO_IMR_RECORD_TEXT);
  const [regCertFile, setRegCertFile] = useState<File | null>(null);
  const [regBusy, setRegBusy] = useState(false);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [autoApprove, setAutoApprove] = useState(false);

  const isDeployed = status === "deployed";
  const doctorPubKeyHex = walletDoctorKeyHex ?? null;
  const isApprovedDoctor =
    doctorPubKeyHex &&
    state?.issuers?.some(
      (i) => i.doctor === doctorPubKeyHex.toLowerCase() && i.status === 2
    );
  const isAdmin = !!doctorPubKeyHex && state?.admin === doctorPubKeyHex.toLowerCase();
  const myRequestPending = !!doctorPubKeyHex && !!state?.pending.some((p) => p.doctor === doctorPubKeyHex.toLowerCase());

  // When this wallet is also the clinic admin (demo / single-clinic setup), approve our own request as soon as it lands.
  useEffect(() => {
    if (!autoApprove || !myRequestPending || !doctorPubKeyHex) return;
    setAutoApprove(false);
    setRegMessage("Request is on-chain. Approving you as a doctor (admin wallet)…");
    void approveIssuer(doctorPubKeyHex, {
      nmcVerification: {
        doctorId: regDoctorId.trim(),
        regdNoValue: regRegNo.trim(),
        ocrNameHint: regName.trim() || undefined,
        ocrSmcHint: regCouncil.trim() || undefined
      }
    })
      .then(() => setRegMessage("You are an approved doctor. Continue with the patient's code below."))
      .catch((e) => setRegError(friendlyErrorMessage(e instanceof Error ? e.message : String(e))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApprove, myRequestPending]);

  // ── Optional Didit identity check: Didit sees the ID, ZKLinic keeps only "approved" + a hash ──
  const apiBase = VERIFICATION_API_URL.replace(/\/$/, "");
  const [diditMode, setDiditMode] = useState<"live" | "mock" | "off">("off");
  const [didit, setDidit] = useState<{ sessionId: string; status: string; approved: boolean } | null>(null);
  const [diditBusy, setDiditBusy] = useState(false);
  const diditKey = (doc: string) => `zkclinic-didit:${doc}`;

  useEffect(() => {
    void fetch(`${apiBase}/didit/config`)
      .then((r) => (r.ok ? r.json() : { mode: "off" }))
      .then((j: { mode?: "live" | "mock" | "off" }) => setDiditMode(j.mode ?? "off"))
      .catch(() => setDiditMode("off"));
  }, [apiBase]);

  useEffect(() => {
    if (!doctorPubKeyHex || diditMode === "off") return;
    const doc = doctorPubKeyHex.toLowerCase();
    // Didit sends the doctor back here with ?verificationSessionId=…
    const params = new URLSearchParams(window.location.search);
    const fromRedirect = params.get("verificationSessionId");
    if (fromRedirect) {
      localStorage.setItem(diditKey(doc), fromRedirect);
      window.history.replaceState(null, "", window.location.pathname);
    }
    const sessionId = fromRedirect ?? localStorage.getItem(diditKey(doc));
    if (!sessionId) return;
    void fetch(`${apiBase}/didit/session/${encodeURIComponent(sessionId)}?doctorPubKeyHex=${doc}`)
      .then(async (r) => {
        const j = (await r.json()) as { status?: string; approved?: boolean; error?: string };
        if (!r.ok) throw new Error(j.error ?? `Didit check failed (${r.status})`);
        setDidit({ sessionId, status: j.status ?? "Not Started", approved: !!j.approved });
      })
      .catch((e) => setRegError(friendlyErrorMessage(e instanceof Error ? e.message : String(e))));
  }, [doctorPubKeyHex, diditMode, apiBase]);

  const startDidit = async () => {
    if (!doctorPubKeyHex) return;
    setRegError(null);
    setDiditBusy(true);
    try {
      const r = await fetch(`${apiBase}/didit/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorPubKeyHex: doctorPubKeyHex.toLowerCase(),
          callback: `${window.location.origin}/app/doctor`
        })
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? `Could not start Didit (${r.status})`);
      window.location.assign(j.url);
    } catch (e) {
      setRegError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
      setDiditBusy(false);
    }
  };

  const searchIcd10 = useCallback(async (q: string) => {
    if (!q.trim()) {
      setIcd10Suggestions(DEMO_ICD10_CODES);
      return;
    }
    try {
      const results = await searchICD10(q, 10);
      setIcd10Suggestions(results.length > 0 ? results : DEMO_ICD10_CODES);
    } catch {
      setIcd10Suggestions(DEMO_ICD10_CODES);
    }
  }, []);

  useEffect(() => {
    searchIcd10(icd10Input);
  }, [icd10Input, searchIcd10]);

  const searchIcd11 = useCallback(async (q: string) => {
    if (!q.trim()) {
      setIcd11Suggestions([]);
      setIcd11Warnings([]);
      return;
    }
    try {
      const { candidates, warnings } = await icd11TextToCodes(q);
      setIcd11Suggestions(candidates);
      setIcd11Warnings(warnings);
    } catch {
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
      setStep(info.hasCredential ? 2 : 1);
    } catch (e) {
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
    setRegBusy(true);
    try {
      const body: Record<string, string> = {
        doctorPubKeyHex: docKey.replace(/^0x/, "").toLowerCase(),
        doctorId: regDoctorId.trim(),
        regdNoValue: regRegNo.trim(),
        imrRecordText: regImrText.trim(),
        // No file attached: the bundled sample certificate stands in (demo deployments only).
        certificateOcrText: regCertFile
          ? `[PDF uploaded: ${regCertFile.name}]`
          : `[PDF uploaded: sample-certificate.pdf]
${DEMO_CERTIFICATE_OCR_TEXT}`
      };
      if (regName.trim()) body.ocrNameHint = regName.trim();
      if (regCouncil.trim()) body.ocrSmcHint = regCouncil.trim();
      if (didit?.approved) body.diditSessionId = didit.sessionId;

      const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/issuer-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = (await res.json()) as { licenseHash?: string; status?: string; registrationId?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? `Registration failed (${res.status})`);
      const lic = (j.licenseHash ?? "").replace(/^0x/, "").toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(lic)) throw new Error("API returned an invalid licenseHash");

      // Submit on-chain so admin can approve
      await submitRequest(lic);
      if (isAdmin) setAutoApprove(true);

      const statusLabel: Record<string, string> = {
        pending_verification: "Pending registry verification (background check)",
        api_verified: "Verified off-chain (IMR + PDF receipt) — awaiting admin on-chain approval",
        pending_admin: "Match inconclusive — pending manual admin review",
        rejected: "Rejected by verification — contact admin",
        admin_approved: "Already approved"
      };
      setRegMessage(
        `Submitted on-chain. API status: ${statusLabel[j.status ?? ""] ?? j.status ?? "unknown"}` +
          ` · reg ${(j.registrationId ?? "").slice(0, 12)}…`
      );
    } catch (e) {
      const chain: unknown[] = [];
      for (let c: unknown = e; c && chain.length < 6; c = (c as { cause?: unknown }).cause) chain.push(c);
      console.error("[ZKLinic] doctor registration failed", ...chain.map((c) => (c instanceof Error ? `${c.name}: ${c.message}` : c)));
      setRegError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    } finally {
      setRegBusy(false);
    }
  };

  const addCode = (entry: ICD10Entry) => {
    if (!selectedCodes.includes(entry.code)) {
      setSelectedCodes([...selectedCodes, entry.code]);
    }
    setIcd10Input("");
  };

  const removeCode = (code: string) => {
    setSelectedCodes(selectedCodes.filter((c) => c !== code));
  };

  const addIcd11 = (entry: Icd11Candidate) => {
    const c = entry.code.trim().toUpperCase();
    if (c && !selectedIcd11.includes(c)) {
      setSelectedIcd11([...selectedIcd11, c]);
    }
    setIcd11Input("");
  };

  const removeIcd11 = (code: string) => {
    setSelectedIcd11(selectedIcd11.filter((c) => c !== code));
  };

  const resolveIcd11Code = async () => {
    const raw = icd11Input.trim();
    if (!raw) return;
    setError(null);
    try {
      const { candidate, warnings } = await icd11CodeToText(raw);
      if (warnings?.length) setIcd11Warnings(warnings);
      if (candidate) addIcd11(candidate);
      else setError("Code not found — try plain-language search instead.");
    } catch (e) {
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
      setError(
        "Your wallet key is not an approved issuer on this contract. " +
          "Register below, then ask admin to approve your issuer request."
      );
      return;
    }
    setError(null);
    try {
      const medications = parseMedicationText(medicationsText);
      const age = ageText.trim() === "" ? undefined : Number(ageText);
      if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 120)) {
        setError("Age must be a whole number between 0 and 120");
        return;
      }
      const clinical = { ageYears: age, labResults: parseLabText(labsText), medications };
      const cont = requestInfo.continuingCredentialId?.trim().replace(/^0x/i, "").toLowerCase();
      const isContinuing = !!cont && /^[0-9a-f]{64}$/.test(cont);

      const payload = isContinuing
        ? createCredentialPayloadContinuingCard(cont, doctorPubKeyHex, selectedCodes, undefined, {
            ...clinical,
            icd11Codes: selectedIcd11.length ? selectedIcd11 : undefined,
            patientIntake: requestInfo.patientIntake
          })
        : createCredentialPayload(doctorPubKeyHex, selectedCodes, undefined, {
            ...clinical,
            icd11Codes: selectedIcd11.length ? selectedIcd11 : undefined,
            patientIntake: requestInfo.patientIntake
          });

      // Private eligibility: attest the attributes the ZK circuit will check, bound to the patient's ZK key.
      // Only the commitment goes on-chain; the attributes travel inside the encrypted card.
      const patientZkKey = requestInfo.patientIntake?.zkPublicKey?.toLowerCase();
      let zkCommitmentHex: string | undefined;
      if (patientZkKey && /^[0-9a-f]{64}$/.test(patientZkKey)) {
        const attrs = attributesFromCredential(payload, crypto.getRandomValues(new Uint8Array(32)));
        payload.zkAttributes = attributesToJson(attrs);
        zkCommitmentHex = toHex(ZKClinic.pureCircuits.credentialCommitment(fromHex(patientZkKey), attrs));
      }

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
      if (zkCommitmentHex) await issueCredentialCommitment(zkCommitmentHex);

      await deliverCredential(
        requestCode.trim().toUpperCase(),
        encrypted,
        payload.credentialId
      );
      setRequestInfo({ ...requestInfo, hasCredential: true });
      setSelectedCodes([]);
      setSelectedIcd11([]);
      setMedicationsText("");
    } catch (e) {
      setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    }
  };

  if (!isDeployed) {
    return (
      <section className={ui.section} data-testid="doctor-gate">
        <div className={ui.sectionInner}>
          <p className={ui.sectionTitle}>Doctor</p>
          <h2 className={ui.h2}>Issue the health card</h2>
          <p className={ui.lead}>Tap <strong>Connect wallet</strong> above to start.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={ui.section} data-testid="doctor-view">
      <div className={ui.sectionInner}>
        <h2 className={ui.h2}>Issue a health card</h2>

        {flowMessage && <p className={ui.msgFlow}>{flowMessage}</p>}
        {error && (
          <p className={ui.msgError} role="alert" data-testid="doctor-error">
            {error}
          </p>
        )}

        {/* ── Unified doctor registration (visible until approved) ── */}
        {!isApprovedDoctor && (
          <div data-testid="doctor-registration-panel">
            <div className={ui.divider} />
            <p className={ui.sectionTitle}>Step 1 · one-time setup</p>
            <h3 className={ui.h2}>Register as a doctor</h3>
            <p className={ui.lead} style={{ maxWidth: "58ch" }}>
              Your registration details are filled in. Tap the button: we check them, put your request on Midnight
              {isAdmin ? ", and approve it with your admin wallet." : ", and the clinic admin approves it."}
            </p>
            {regError && (
              <p className={ui.msgError} role="alert" data-testid="doctor-reg-error">
                {regError}
              </p>
            )}
            {regMessage && (
              <p className={ui.msg} data-testid="doctor-reg-message">
                {regMessage}
              </p>
            )}
            <details className="zk-explain">
              <summary>Check or edit my registration details</summary>
            <div className={ui.stackSm} style={{ maxWidth: "36rem", marginTop: "0.75rem" }}>
              <label className={ui.msgMuted}>
                Full name
                <input
                  className={ui.input}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder="Dr. Ananya Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  data-testid="input-reg-name"
                />
              </label>
              <label className={ui.msgMuted}>
                IMR / register excerpt
                <textarea
                  className={`${ui.input} zk-doctor-imr`}
                  rows={5}
                  style={{ display: "block", width: "100%", marginTop: 4, maxWidth: "40rem" }}
                  placeholder="Paste IMR or register excerpt…"
                  value={regImrText}
                  onChange={(e) => setRegImrText(e.target.value)}
                  data-testid="input-reg-imr-text"
                />
              </label>
              <label className={ui.msgMuted}>
                Doctor ID (IMR / NMC)
                <input
                  className={ui.input}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder="e.g. 6085963"
                  value={regDoctorId}
                  onChange={(e) => setRegDoctorId(e.target.value)}
                  data-testid="input-reg-doctor-id"
                />
              </label>
              <label className={ui.msgMuted}>
                Registration number
                <input
                  className={ui.input}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder="e.g. DL45218"
                  value={regRegNo}
                  onChange={(e) => setRegRegNo(e.target.value)}
                  data-testid="input-reg-reg-no"
                />
              </label>
              <label className={ui.msgMuted}>
                Council / State Medical Council (optional)
                <input
                  className={ui.input}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  placeholder="e.g. Delhi Medical Council"
                  value={regCouncil}
                  onChange={(e) => setRegCouncil(e.target.value)}
                  data-testid="input-reg-council"
                />
              </label>
              <label className={ui.msgMuted}>
                Registration certificate PDF (optional; a sample is used in this demo)
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className={ui.input}
                  style={{ display: "block", marginTop: 4 }}
                  data-testid="input-reg-cert-pdf"
                  onChange={(e) => setRegCertFile(e.target.files?.[0] ?? null)}
                />
                {regCertFile ? (
                  <span className={ui.msgMuted} style={{ fontSize: "0.75rem" }}>
                    {regCertFile.name} selected ✓
                  </span>
                ) : (
                  <span className={ui.msgMuted} style={{ fontSize: "0.75rem" }}>
                    No file: the sample certificate is used.
                  </span>
                )}
              </label>
            </div>
            </details>
            {diditMode !== "off" && (
              <div className="zk-didit" data-testid="didit-panel">
                {didit?.approved ? (
                  <p className={ui.msg} data-testid="didit-verified">
                    ✓ Identity verified with Didit. ZKLinic keeps only this result, never your ID.
                  </p>
                ) : (
                  <>
                    <p className={ui.msgMuted}>
                      Optional: confirm it's really you with a quick ID and selfie check by Didit. Your ID stays with
                      Didit; ZKLinic only learns that the check passed.
                      {didit && <> Last check: {didit.status}.</>}
                    </p>
                    <button
                      type="button"
                      className={ui.btn}
                      data-testid="btn-didit"
                      onClick={() => void startDidit()}
                      disabled={diditBusy || !doctorPubKeyHex}
                    >
                      {diditBusy ? "Opening Didit…" : "Verify my identity with Didit"}
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              className={ui.btnPrimary}
              style={{ marginTop: "1rem" }}
              data-testid="btn-doctor-register"
              onClick={() => void handleDoctorRegistration()}
              disabled={
                regBusy ||
                !regDoctorId.trim() ||
                !regRegNo.trim() ||
                regImrText.trim().length < 8 ||
                myRequestPending
              }
            >
              {regBusy ? "Registering…" : myRequestPending ? "Waiting for approval…" : "Register as a doctor"}
            </button>
          </div>
        )}

        <Steps labels={["Find the patient", "Fill the card", "Sign and send"]} step={step} onStep={setStep}>
          <div>
        <h3 className={ui.h2}>Enter the patient&apos;s code</h3>
        <p className={ui.lead}>The patient shows you a short code from their phone.</p>
        <div className={ui.inputRow}>
          <input
            className={ui.input}
            placeholder="e.g. ABC12XY9"
            value={requestCode}
            onChange={(e) => {
              setRequestCode(e.target.value.toUpperCase());
              setRequestInfo(null);
            }}
            data-testid="input-request-code"
          />
          <button
            type="button"
            className={ui.btnPrimary}
            data-testid="btn-lookup-request"
            onClick={handleLookupRequest}
            disabled={!requestCode.trim()}
          >
            Find patient
          </button>
        </div>
        {requestInfo && (
          <p className={ui.msg} data-testid="request-info">
            Request <code className={ui.code}>{requestInfo.requestId.slice(0, 12)}…</code>
            {requestInfo.hasCredential ? (
              <span style={{ color: "var(--zk-green-dark)" }}> — Delivered</span>
            ) : (
              <span> — Ready to sign</span>
            )}
            {requestInfo.hasPatientIntake ? (
              <span> · Patient intake attached (merged into encrypted card)</span>
            ) : null}
            {requestInfo.hasContinuingCredentialId && requestInfo.continuingCredentialId ? (
              <span>
                {" "}
                · <strong>Continuing card</strong>{" "}
                <code className={ui.code}>{requestInfo.continuingCredentialId.slice(0, 12)}…</code>
              </span>
            ) : null}
          </p>
        )}

        {requestInfo?.patientIntake && !requestInfo.hasCredential && (
          <div className={ui.highlight} style={{ marginTop: "0.75rem" }} data-testid="doctor-patient-intake-preview">
            <p className={ui.highlightLabel}>Patient-provided context (private)</p>
            <ul className={ui.list} style={{ fontSize: "0.8125rem", margin: 0 }}>
              {requestInfo.patientIntake.chiefComplaint ? (
                <li>
                  <strong>Chief complaint:</strong> {requestInfo.patientIntake.chiefComplaint}
                </li>
              ) : null}
              {requestInfo.patientIntake.narrative ? (
                <li>
                  <strong>Narrative:</strong> {requestInfo.patientIntake.narrative.slice(0, 280)}
                  {requestInfo.patientIntake.narrative.length > 280 ? "…" : ""}
                </li>
              ) : null}
              {(requestInfo.patientIntake.conditions?.length ?? 0) > 0 ? (
                <li>
                  <strong>Conditions:</strong>{" "}
                  {requestInfo.patientIntake.conditions!
                    .map((c) => c.label || c.icd10 || c.icd11 || "—")
                    .join("; ")}
                </li>
              ) : null}
              {(requestInfo.patientIntake.medicationsList?.length ?? 0) > 0 ? (
                <li>
                  <strong>Med list (patient):</strong> {requestInfo.patientIntake.medicationsList!.join(", ")}
                </li>
              ) : null}
              {(requestInfo.patientIntake.allergies?.length ?? 0) > 0 ? (
                <li>
                  <strong>Allergies:</strong> {requestInfo.patientIntake.allergies!.join(", ")}
                </li>
              ) : null}
            </ul>
          </div>
        )}

          </div>

          <div>
        {!(requestInfo && !requestInfo.hasCredential) && (
          <p className={ui.lead}>Find a patient in step 1 first.</p>
        )}
        {requestInfo && !requestInfo.hasCredential && (
          <>
            <h3 className={ui.h2}>Diagnosis codes</h3>
            <p className={ui.lead}>Search and tap to add. Example values are filled in for you.</p>
            <div className={ui.relative}>
              <input
                className={ui.input}
                style={{ width: "100%", maxWidth: "28rem" }}
                placeholder="Search (e.g. diabetes, E11)"
                value={icd10Input}
                onChange={(e) => setIcd10Input(e.target.value)}
                onFocus={() => icd10Input === "" && setIcd10Suggestions(DEMO_ICD10_CODES)}
                data-testid="input-icd10-search"
              />
              {icd10Suggestions.length > 0 && (
                <ul className={ui.dropdown} data-testid="icd10-dropdown">
                  {icd10Suggestions.slice(0, 8).map((entry, i) => (
                    <li
                      key={`${entry.code}-${i}`}
                      onClick={() => addCode(entry)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") addCode(entry);
                      }}
                      role="option"
                    >
                      <code className={ui.code}>{entry.code}</code> — {entry.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedCodes.length > 0 && (
              <div style={{ marginTop: "0.75rem" }} data-testid="icd10-selected">
                {selectedCodes.map((c) => (
                  <span key={c} className={ui.chip}>
                    {c}
                    <button type="button" onClick={() => removeCode(c)} aria-label={`Remove ${c}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <h3 className={ui.h2} style={{ marginTop: "1rem" }}>
              ICD-11 (plain language or code)
            </h3>
            <p className={ui.msgMuted} style={{ marginBottom: "0.5rem" }}>
              Uses verification API: LLM suggestions + WHO validation when configured.
            </p>
            {icd11Warnings.length > 0 && (
              <p className={ui.msgMuted} style={{ fontSize: "0.75rem" }}>
                {icd11Warnings.join(" · ")}
              </p>
            )}
            <div className={ui.inputRow} style={{ flexWrap: "wrap", maxWidth: "28rem" }}>
              <input
                className={ui.input}
                style={{ flex: 1, minWidth: "12rem" }}
                placeholder="e.g. type 2 diabetes or MMS code (5A11)"
                value={icd11Input}
                onChange={(e) => setIcd11Input(e.target.value)}
                data-testid="input-icd11-search"
              />
              <button type="button" className={ui.btn} data-testid="btn-icd11-resolve-code" onClick={() => void resolveIcd11Code()}>
                Resolve code
              </button>
            </div>
            <div className={ui.relative}>
              {icd11Suggestions.length > 0 && (
                <ul className={ui.dropdown} data-testid="icd11-dropdown">
                  {icd11Suggestions.slice(0, 8).map((entry, i) => (
                    <li
                      key={`${entry.code}-${i}`}
                      onClick={() => addIcd11(entry)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") addIcd11(entry);
                      }}
                      role="option"
                    >
                      <code className={ui.code}>{entry.code}</code> — {entry.title}
                      {entry.validatedByWho ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedIcd11.length > 0 && (
              <div style={{ marginTop: "0.75rem" }} data-testid="icd11-selected">
                {selectedIcd11.map((c) => (
                  <span key={c} className={ui.chip}>
                    {c}
                    <button type="button" onClick={() => removeIcd11(c)} aria-label={`Remove ${c}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className={ui.divider} style={{ margin: "1.25rem 0" }} />
            <p className={ui.sectionTitle}>Attested for private proofs</p>
            <h3 className={ui.h2}>Age & lab results</h3>
            <p className={ui.msgMuted} style={{ marginBottom: "0.5rem" }}>
              These, plus the diagnosis codes above, are what the patient can later prove in zero knowledge. Only a
              commitment goes on-chain — never the values.
              {requestInfo.patientIntake?.zkPublicKey
                ? ""
                : " This request has no patient ZK key, so the card will not support on-chain proofs."}
            </p>
            <div className={ui.inputRow}>
              <label>
                Age (years)
                <input
                  className={ui.input}
                  inputMode="numeric"
                  value={ageText}
                  onChange={(e) => setAgeText(e.target.value)}
                  data-testid="doctor-age"
                />
              </label>
            </div>
            <label htmlFor="doctor-labs" className={ui.msgMuted}>
              Lab results, one per line (name, value, optional unit)
            </label>
            <textarea
              id="doctor-labs"
              className={ui.input}
              rows={3}
              placeholder={"HbA1c 8.2 %\neGFR 74"}
              value={labsText}
              onChange={(e) => setLabsText(e.target.value)}
              data-testid="doctor-labs"
            />

            <div className={ui.divider} style={{ margin: "1.25rem 0" }} />
            <p className={ui.sectionTitle}>Medications</p>
            <h3 className={ui.h2}>Prescriptions & supplements</h3>
            <p className={ui.msgMuted} style={{ marginBottom: "0.5rem" }}>
              One per line or comma-separated. Included in the encrypted credential (not on-chain in plain text).
            </p>
            <textarea
              className={`${ui.input} zk-doctor-meds`}
              rows={4}
              placeholder={"Metformin 500mg twice daily\nLisinopril 10mg"}
              value={medicationsText}
              onChange={(e) => setMedicationsText(e.target.value)}
              data-testid="doctor-medications"
            />
          </>
        )}

          </div>

          <div>
            <h3 className={ui.h2}>Sign and send</h3>
        {!requestInfo && <p className={ui.lead}>Find a patient in step 1 first.</p>}
        {requestInfo?.hasCredential && (
          <p className={ui.msg} data-testid="doctor-card-sent">
            Card sent. The patient can collect it on their phone now.
          </p>
        )}
        {requestInfo && !requestInfo.hasCredential && (
          <div style={{ marginTop: "0.5rem" }}>
            <p className={ui.lead}>
              {selectedCodes.length + selectedIcd11.length} diagnosis code(s), age {ageText || "not set"},{" "}
              {parseLabText(labsText).length} lab result(s). Your wallet will ask you to approve up to three steps.
            </p>
            <button
              type="button"
              className={ui.btnArrow}
              data-testid="btn-sign-deliver"
              onClick={handleSignAndDeliver}
              disabled={!isApprovedDoctor}
            >
              Sign and send to patient
            </button>
          </div>
        )}
          </div>
        </Steps>

        {isApprovedDoctor && (
          <details className="zk-explain" style={{ marginTop: "1.5rem" }}>
            <summary>Cancel a card I issued</summary>
            <p className={ui.lead}>Paste the card ID (64 characters).</p>
            <div className={ui.inputRow}>
              <input
                className={ui.input}
                placeholder="Credential ID (64 hex)"
                value={credentialToRevoke}
                onChange={(e) => setCredentialToRevoke(e.target.value)}
                data-testid="input-revoke-credential"
              />
              <button
                type="button"
                className={ui.btn}
                data-testid="btn-revoke-credential"
                onClick={async () => {
                  setError(null);
                  try {
                    await revokeCredential(credentialToRevoke.trim());
                    setCredentialToRevoke("");
                  } catch (e) {
                    setError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
                  }
                }}
                disabled={credentialToRevoke.trim().length !== 64}
              >
                Cancel card
              </button>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
