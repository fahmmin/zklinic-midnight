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
  DEMO_DOCTOR_ICD10_CODES,
  DEMO_DOCTOR_MEDICATIONS_BLOCK,
  DEMO_IMR_RECORD_TEXT,
  DEMO_NMC_DOCTOR_ID,
  DEMO_NMC_REGISTRATION_NO,
  DEMO_OCR_NAME_HINT,
  DEMO_OCR_SMC_HINT
} from "../lib/demoWorkspaceMocks";
import { ui } from "../ui";

const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

export function DoctorView() {
  const {
    fetchCredentialRequest,
    deliverCredential,
    registerCredential,
    appendDiagnosisToCredential,
    revokeCredential,
    submitRequest,
    state,
    flowMessage,
    status,
    walletDoctorKeyHex
  } = useZKClinic();

  const [requestCode, setRequestCode] = useState("");
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

  const isDeployed = status === "deployed";
  const doctorPubKeyHex = walletDoctorKeyHex ?? null;
  const isApprovedDoctor =
    doctorPubKeyHex &&
    state?.issuers?.some(
      (i) => i.doctor === doctorPubKeyHex.toLowerCase() && i.status === 2
    );

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
    if (!regCertFile) {
      setRegError("Attach a registration certificate PDF (required).");
      return;
    }
    setRegBusy(true);
    try {
      const body: Record<string, string> = {
        doctorPubKeyHex: docKey.replace(/^0x/, "").toLowerCase(),
        doctorId: regDoctorId.trim(),
        regdNoValue: regRegNo.trim(),
        imrRecordText: regImrText.trim(),
        certificateOcrText: `[PDF uploaded: ${regCertFile.name}]`
      };
      if (regName.trim()) body.ocrNameHint = regName.trim();
      if (regCouncil.trim()) body.ocrSmcHint = regCouncil.trim();

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
          <p className={ui.lead}>Deploy or join a contract first — the card is what patients use for trial matching.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={ui.section} data-testid="doctor-view">
      <div className={ui.sectionInner}>
        <p className={ui.sectionTitle}>Doctor · attests the card</p>
        <h2 className={ui.h2}>Sign & deliver the credential</h2>
        <p className={ui.lead}>
          Look up the patient&apos;s request code, add this visit&apos;s diagnoses (ICD-10 and/or ICD-11).{" "}
          <strong>New card:</strong> the contract registers one credential id, then records this visit&apos;s diagnosis
          commitment on the card&apos;s on-chain timeline. <strong>Continuing card:</strong> when the patient flagged
          an existing card id, you only append a new commitment — same id, same issuing doctor. Encrypted updates use a
          key derived from that id so the patient can decrypt every visit.
        </p>

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
              One registration path: paste an IMR / register excerpt and upload your registration certificate PDF.
              Off-chain verification checks the excerpt and registers the certificate upload; your issuer request is
              submitted on-chain in the same step. An admin still approves the issuer on-chain.
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
                Registration certificate PDF (required)
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
                    Choose a file to enable auto off-chain verification.
                  </span>
                )}
              </label>
            </div>
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
                !regCertFile
              }
            >
              {regBusy ? "Registering…" : "Register & submit request →"}
            </button>
            <p className={ui.msgMuted} style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
              With IMR excerpt + PDF attached, off-chain verification completes immediately; then use Admin → Approve
              issuer after your on-chain request appears.
            </p>
          </div>
        )}

        <div className={ui.divider} />

        <p className={ui.sectionTitle}>Lookup</p>
        <h3 className={ui.h2}>Patient request code</h3>
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
            Look up →
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

        {requestInfo && !requestInfo.hasCredential && (
          <>
            <div className={ui.divider} />
            <p className={ui.sectionTitle}>Diagnosis</p>
            <h3 className={ui.h2}>ICD-10 codes (NLM)</h3>
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

        {requestInfo && !requestInfo.hasCredential && (selectedCodes.length > 0 || selectedIcd11.length > 0) && (
          <div style={{ marginTop: "1.25rem" }}>
            <button
              type="button"
              className={ui.btnArrow}
              data-testid="btn-sign-deliver"
              onClick={handleSignAndDeliver}
              disabled={!isApprovedDoctor}
            >
              Sign & deliver
            </button>
          </div>
        )}

        {isApprovedDoctor && (
          <>
            <div className={ui.divider} />
            <p className={ui.sectionTitle}>Safety</p>
            <h3 className={ui.h2}>Revoke credential</h3>
            <p className={ui.lead}>On-chain revocation by credential ID (64 hex).</p>
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
                Revoke
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
