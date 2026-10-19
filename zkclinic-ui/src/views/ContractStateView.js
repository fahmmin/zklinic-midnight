import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { ui } from "../ui";
const TRIAL_STATUS_LABELS = ["Open", "Closed", "Full"];
function shortHex(hex, head = 10, tail = 6) {
    const h = hex.replace(/^0x/i, "").toLowerCase();
    if (h.length <= head + tail + 1)
        return h;
    return `${h.slice(0, head)}…${h.slice(-tail)}`;
}
function StatCard({ label, value, sub }) {
    return (_jsxs("div", { className: "zk-contract-stat-card", "data-testid": `contract-stat-${label.replace(/\s+/g, "-").toLowerCase()}`, children: [_jsx("p", { className: "zk-contract-stat-card__label", children: label }), _jsx("p", { className: "zk-contract-stat-card__value", children: value }), sub ? _jsx("p", { className: "zk-contract-stat-card__sub", children: sub }) : null] }));
}
function IssuerStatusLabel({ status }) {
    const map = {
        0: "None",
        1: "Pending",
        2: "Approved",
        3: "Revoked"
    };
    return _jsx("span", { className: "zk-contract-pill", children: map[status] ?? `Status ${status}` });
}
export function ContractStateView({ contractAddress, state, onRefresh }) {
    const [refreshBusy, setRefreshBusy] = useState(false);
    const approvedIssuers = state?.issuers.filter((i) => i.status === 2).length ?? 0;
    const handleRefresh = () => {
        setRefreshBusy(true);
        void Promise.resolve(onRefresh()).finally(() => setRefreshBusy(false));
    };
    return (_jsxs("section", { className: "zk-contract-dashboard", "data-testid": "contract-state-view", "aria-label": "On-chain contract status", children: [_jsxs("div", { className: "zk-contract-dashboard__header", children: [_jsxs("div", { children: [_jsx("p", { className: ui.sectionTitle, children: "Connected contract" }), _jsx("h2", { className: ui.h2, children: "On-chain status" }), _jsxs("p", { className: "zk-contract-dashboard__address", "data-testid": "contract-address-readable", children: [_jsx("span", { className: "zk-contract-dashboard__address-label", children: "Address" }), _jsx("code", { className: "zk-contract-dashboard__address-hex", children: contractAddress })] })] }), _jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-refresh-state", onClick: handleRefresh, disabled: refreshBusy, children: refreshBusy ? "Refreshing…" : "Refresh from indexer" })] }), !state ? (_jsx("p", { className: ui.msgFlow, "data-testid": "contract-state-loading", children: "Loading ledger view\u2026 If this hangs, check the indexer and your network, then refresh." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "zk-contract-stat-grid", children: [_jsx(StatCard, { label: "Contract admin", value: shortHex(state.admin), sub: "32-byte coin public key" }), _jsx(StatCard, { label: "Pending issuer requests", value: state.pending.length }), _jsx(StatCard, { label: "Approved issuers", value: approvedIssuers, sub: `${state.issuers.length} total records` }), _jsx(StatCard, { label: "Active trials", value: state.trials.length }), _jsx(StatCard, { label: "Revoked credentials", value: state.revokedCredentialIds.length })] }), state.pending.length > 0 && (_jsxs("div", { className: "zk-contract-panel", "data-testid": "contract-panel-pending", children: [_jsx("h3", { className: "zk-contract-panel__title", children: "Pending issuer requests" }), _jsx("ul", { className: "zk-contract-panel__list", children: state.pending.map((p, i) => (_jsxs("li", { className: "zk-contract-list-row", children: [_jsxs("div", { children: [_jsx("span", { className: "zk-contract-list-row__meta", children: "Doctor key" }), _jsx("code", { className: "zk-contract-list-row__hex", children: p.doctor })] }), _jsxs("div", { children: [_jsx("span", { className: "zk-contract-list-row__meta", children: "License hash" }), _jsx("code", { className: "zk-contract-list-row__hex", children: p.hash })] })] }, `${p.doctor}-${p.hash}-${i}`))) })] })), state.issuers.length > 0 && (_jsxs("div", { className: "zk-contract-panel", "data-testid": "contract-panel-issuers", children: [_jsx("h3", { className: "zk-contract-panel__title", children: "Issuers" }), _jsx("ul", { className: "zk-contract-panel__list", children: state.issuers.map((row, idx) => (_jsxs("li", { className: "zk-contract-list-row zk-contract-list-row--stack", children: [_jsxs("div", { className: "zk-contract-list-row__top", children: [_jsx(IssuerStatusLabel, { status: row.status }), _jsx("code", { className: "zk-contract-list-row__hex zk-contract-list-row__hex--sm", children: row.doctor })] }), _jsxs("div", { className: "zk-contract-list-row__grid", children: [_jsxs("div", { children: [_jsx("span", { className: "zk-contract-list-row__meta", children: "License hash" }), _jsx("code", { className: "zk-contract-list-row__hex zk-contract-list-row__hex--sm", children: row.hash })] }), _jsxs("div", { children: [_jsx("span", { className: "zk-contract-list-row__meta", children: "Attestation" }), _jsx("code", { className: "zk-contract-list-row__hex zk-contract-list-row__hex--sm", children: row.attestationHash })] })] })] }, `${row.doctor}-${idx}`))) })] })), state.trials.length > 0 && (_jsxs("div", { className: "zk-contract-panel", "data-testid": "contract-panel-trials", children: [_jsx("h3", { className: "zk-contract-panel__title", children: "Trials on-chain" }), _jsx("ul", { className: "zk-contract-panel__list", children: state.trials.map((t) => (_jsxs("li", { className: "zk-contract-list-row zk-contract-list-row--trial", children: [_jsxs("div", { children: [_jsx("span", { className: "zk-contract-list-row__meta", children: "Trial id" }), _jsx("code", { className: "zk-contract-list-row__hex zk-contract-list-row__hex--sm", children: shortHex(t.trialId, 12, 8) })] }), _jsxs("div", { className: "zk-contract-trial-meta", children: [_jsxs("span", { children: ["Slots ", t.slotsFilled.toString(), " / ", t.slotsTotal.toString()] }), _jsx("span", { children: TRIAL_STATUS_LABELS[t.status] ?? `Status ${t.status}` }), _jsxs("span", { children: ["Min match \u2265 ", (Number(t.eligibilityThresholdBps) / 100).toFixed(0), "%"] })] })] }, t.trialId))) })] }))] }))] }));
}
