import { useState } from "react";
import { ui } from "../ui";
import type { ZKClinicState, TrialLedgerEntry } from "../contexts/ZKClinicContext";

const TRIAL_STATUS_LABELS = ["Open", "Closed", "Full"];

function shortHex(hex: string, head = 10, tail = 6): string {
  const h = hex.replace(/^0x/i, "").toLowerCase();
  if (h.length <= head + tail + 1) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

function StatCard({
  label,
  value,
  sub
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="zk-contract-stat-card" data-testid={`contract-stat-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <p className="zk-contract-stat-card__label">{label}</p>
      <p className="zk-contract-stat-card__value">{value}</p>
      {sub ? <p className="zk-contract-stat-card__sub">{sub}</p> : null}
    </div>
  );
}

function IssuerStatusLabel({ status }: { status: number }) {
  const map: Record<number, string> = {
    0: "None",
    1: "Pending",
    2: "Approved",
    3: "Revoked"
  };
  return <span className="zk-contract-pill">{map[status] ?? `Status ${status}`}</span>;
}

export type ContractStateViewProps = {
  contractAddress: string;
  state: ZKClinicState | null;
  onRefresh: () => void | Promise<void>;
};

export function ContractStateView({ contractAddress, state, onRefresh }: ContractStateViewProps) {
  const [refreshBusy, setRefreshBusy] = useState(false);
  const approvedIssuers = state?.issuers.filter((i) => i.status === 2).length ?? 0;

  const handleRefresh = () => {
    setRefreshBusy(true);
    void Promise.resolve(onRefresh()).finally(() => setRefreshBusy(false));
  };

  return (
    <section className="zk-contract-dashboard" data-testid="contract-state-view" aria-label="On-chain contract status">
      <div className="zk-contract-dashboard__header">
        <div>
          <p className={ui.sectionTitle}>Connected contract</p>
          <h2 className={ui.h2}>On-chain status</h2>
          <p className="zk-contract-dashboard__address" data-testid="contract-address-readable">
            <span className="zk-contract-dashboard__address-label">Address</span>
            <code className="zk-contract-dashboard__address-hex">{contractAddress}</code>
          </p>
        </div>
        <button
          type="button"
          className={ui.btnPrimary}
          data-testid="btn-refresh-state"
          onClick={handleRefresh}
          disabled={refreshBusy}
        >
          {refreshBusy ? "Refreshing…" : "Refresh from indexer"}
        </button>
      </div>

      {!state ? (
        <p className={ui.msgFlow} data-testid="contract-state-loading">
          Loading ledger view… If this hangs, check the indexer and your network, then refresh.
        </p>
      ) : (
        <>
          <div className="zk-contract-stat-grid">
            <StatCard label="Contract admin" value={shortHex(state.admin)} sub="32-byte coin public key" />
            <StatCard label="Pending issuer requests" value={state.pending.length} />
            <StatCard label="Approved issuers" value={approvedIssuers} sub={`${state.issuers.length} total records`} />
            <StatCard label="Active trials" value={state.trials.length} />
            <StatCard label="Revoked credentials" value={state.revokedCredentialIds.length} />
          </div>

          {state.pending.length > 0 && (
            <div className="zk-contract-panel" data-testid="contract-panel-pending">
              <h3 className="zk-contract-panel__title">Pending issuer requests</h3>
              <ul className="zk-contract-panel__list">
                {state.pending.map((p, i) => (
                  <li key={`${p.doctor}-${p.hash}-${i}`} className="zk-contract-list-row">
                    <div>
                      <span className="zk-contract-list-row__meta">Doctor key</span>
                      <code className="zk-contract-list-row__hex">{p.doctor}</code>
                    </div>
                    <div>
                      <span className="zk-contract-list-row__meta">License hash</span>
                      <code className="zk-contract-list-row__hex">{p.hash}</code>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.issuers.length > 0 && (
            <div className="zk-contract-panel" data-testid="contract-panel-issuers">
              <h3 className="zk-contract-panel__title">Issuers</h3>
              <ul className="zk-contract-panel__list">
                {state.issuers.map((row, idx) => (
                  <li key={`${row.doctor}-${idx}`} className="zk-contract-list-row zk-contract-list-row--stack">
                    <div className="zk-contract-list-row__top">
                      <IssuerStatusLabel status={row.status} />
                      <code className="zk-contract-list-row__hex zk-contract-list-row__hex--sm">{row.doctor}</code>
                    </div>
                    <div className="zk-contract-list-row__grid">
                      <div>
                        <span className="zk-contract-list-row__meta">License hash</span>
                        <code className="zk-contract-list-row__hex zk-contract-list-row__hex--sm">{row.hash}</code>
                      </div>
                      <div>
                        <span className="zk-contract-list-row__meta">Attestation</span>
                        <code className="zk-contract-list-row__hex zk-contract-list-row__hex--sm">{row.attestationHash}</code>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.trials.length > 0 && (
            <div className="zk-contract-panel" data-testid="contract-panel-trials">
              <h3 className="zk-contract-panel__title">Trials on-chain</h3>
              <ul className="zk-contract-panel__list">
                {state.trials.map((t: TrialLedgerEntry) => (
                  <li key={t.trialId} className="zk-contract-list-row zk-contract-list-row--trial">
                    <div>
                      <span className="zk-contract-list-row__meta">Trial id</span>
                      <code className="zk-contract-list-row__hex zk-contract-list-row__hex--sm">{shortHex(t.trialId, 12, 8)}</code>
                    </div>
                    <div className="zk-contract-trial-meta">
                      <span>
                        Slots {t.slotsFilled.toString()} / {t.slotsTotal.toString()}
                      </span>
                      <span>{TRIAL_STATUS_LABELS[t.status] ?? `Status ${t.status}`}</span>
                      <span>Min match ≥ {(Number(t.eligibilityThresholdBps) / 100).toFixed(0)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
