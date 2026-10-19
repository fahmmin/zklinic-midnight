import { useMemo } from "react";
import { getStoredProofs } from "../../proofStorage";
import { ui } from "../../ui";
import { formatShortId, proofExpiresInLabel } from "./patientCardUtils";

type ProofTimelineProps = {
  credentialId: string;
  refreshKey?: number;
};

export function ProofTimeline({ credentialId, refreshKey }: ProofTimelineProps) {
  const proofs = useMemo(() => {
    return getStoredProofs()
      .filter((p) => p.credentialId.toLowerCase() === credentialId.toLowerCase())
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [credentialId, refreshKey]);

  if (proofs.length === 0) {
    return (
      <p className={ui.msgMuted} data-testid="proof-timeline-empty" style={{ margin: "0.5rem 0 0" }}>
        No trial proofs yet. When you apply, only a proof ID and rule results are shared — not your record.
      </p>
    );
  }

  return (
    <ul className={ui.list} data-testid="proof-timeline" style={{ marginTop: "0.5rem" }}>
      {proofs.map((p) => {
        const expired = Date.now() > p.expiresAt;
        return (
          <li key={p.proofId}>
            <strong>{p.trialTitle}</strong>
            <span className={ui.msgMuted} style={{ display: "block", fontSize: "0.75rem", marginTop: 4 }}>
              Proof <code className={ui.code}>{formatShortId(p.proofId, 6, 6)}</code>
              {" · "}
              Pseudonym <code className={ui.code}>{formatShortId(p.pseudonym, 4, 4)}</code>
              {" · "}
              {expired ? (
                <span style={{ color: "var(--zk-danger)" }}>Expired — regenerate if needed</span>
              ) : (
                <>
                  Valid {proofExpiresInLabel(p.expiresAt)} (30-day window)
                </>
              )}
            </span>
            <span className={ui.msgMuted} style={{ display: "block", fontSize: "0.7rem", marginTop: 2 }}>
              Rules: {p.criterionResults.filter((c) => c.passed).length}/{p.criterionResults.length} passed
            </span>
          </li>
        );
      })}
    </ul>
  );
}
