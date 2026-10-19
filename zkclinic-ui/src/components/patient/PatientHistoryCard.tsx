import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { decryptCredential, isCredentialExpired } from "../../credential";
import type { HealthCredentialPayload } from "../../credential";
import type { StoredCredentialMeta } from "../../credentialStorage";
import { ui } from "../../ui";
import { ProofTimeline } from "./ProofTimeline";
import { DisclosureSummary } from "./DisclosureSummary";
import { computeHealthEvidenceScore } from "./patientCardUtils";

export type PatientHistoryCardProps = {
  meta: StoredCredentialMeta;
  revoked: boolean;
  selected: boolean;
  onSelect: () => void;
  proofRefreshKey?: number;
};

export function PatientHistoryCard({
  meta,
  revoked,
  selected,
  onSelect,
  proofRefreshKey
}: PatientHistoryCardProps) {
  const [payload, setPayload] = useState<HealthCredentialPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      try {
        const p = await decryptCredential(meta.encryptedCredential, meta.requestCode, meta.credentialId);
        if (!cancelled) setPayload(p);
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setLoadError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meta.encryptedCredential, meta.requestCode, meta.credentialId]);

  const expired = payload ? isCredentialExpired(payload) : false;
  const score = computeHealthEvidenceScore({
    revoked,
    expired,
    expiresAt: payload?.expiresAt ?? meta.fetchedAt
  });

  const n10 = payload?.icd10Codes?.length ?? 0;
  const n11 = payload?.icd11Codes?.length ?? 0;
  const conditionLabel =
    n10 + n11 > 0
      ? `${n10 + n11} condition${n10 + n11 === 1 ? "" : "s"} on file` +
        (n10 && n11 ? ` (${n10} ICD-10, ${n11} ICD-11)` : n11 ? " (ICD-11)" : "")
      : "—";

  const medCount = payload?.medications?.length ?? 0;
  const medLabel =
    medCount > 0
      ? `${medCount} medication${medCount === 1 ? "" : "s"} recorded`
      : "No medications on card";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={`zk-health-card ${selected ? "zk-health-card--selected" : ""}`}
      data-testid="patient-history-card"
      data-selected={selected}
      whileHover={{ y: -2 }}
    >
      <button
        type="button"
        className="zk-health-card__select"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={selected ? "Selected health card" : "Select this health card for trial checks"}
      >
        <div className="zk-health-card__shine" aria-hidden />
        <div className="zk-health-card__top">
          <div className="zk-health-card__chip-wrap">
            <div className="zk-health-card__chip" aria-hidden />
            <div>
              <p className="zk-health-card__label">ZKClinic health card</p>
              <p className="zk-health-card__id">···· {meta.credentialId.slice(-4)}</p>
            </div>
          </div>
          <div className="zk-health-card__score" data-testid="health-evidence-score">
            <span className="zk-health-card__score-value">{revoked || expired ? "—" : score}</span>
            <span className="zk-health-card__score-caption">trust</span>
          </div>
        </div>

        <div className="zk-health-card__strip" aria-hidden />

        <div className="zk-health-card__row">
          <span>Status</span>
          <span className="zk-health-card__chips">
            {revoked ? (
              <span className="zk-chip zk-chip--bad">Revoked</span>
            ) : expired ? (
              <span className="zk-chip zk-chip--bad">Expired</span>
            ) : (
              <span className="zk-chip zk-chip--ok">Active</span>
            )}
          </span>
        </div>
        <div className="zk-health-card__row">
          <span>Conditions</span>
          <span>{loadError ? "Could not unlock card" : conditionLabel}</span>
        </div>
        <div className="zk-health-card__row">
          <span>Medications</span>
          <span>{loadError ? "—" : medLabel}</span>
        </div>
        <div className="zk-health-card__row">
          <span>Valid until</span>
          <span>
            {payload
              ? new Date(payload.expiresAt).toLocaleDateString()
              : loadError
                ? "—"
                : "…"}
          </span>
        </div>
        <div className="zk-health-card__row zk-health-card__row--muted">
          <span>Stored on</span>
          <span>this device only</span>
        </div>
      </button>

      {loadError && (
        <p className={ui.msgError} role="alert" style={{ margin: "0.75rem 0 0", fontSize: "0.8rem" }}>
          {loadError}
        </p>
      )}

      <div style={{ padding: "0 1rem 1rem" }}>
        <p className={ui.sectionTitle} style={{ marginBottom: "0.35rem" }}>
          Privacy
        </p>
        <DisclosureSummary compact />
        <p className={ui.sectionTitle} style={{ margin: "1rem 0 0.35rem" }}>
          Trial proofs (this card)
        </p>
        <ProofTimeline credentialId={meta.credentialId} refreshKey={proofRefreshKey} />
      </div>
    </motion.article>
  );
}
