import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { decryptCredential, isCredentialExpired } from "../../credential";
import { ui } from "../../ui";
import { ProofTimeline } from "./ProofTimeline";
import { DisclosureSummary } from "./DisclosureSummary";
import { computeHealthEvidenceScore } from "./patientCardUtils";
export function PatientHistoryCard({ meta, revoked, selected, onSelect, proofRefreshKey }) {
    const [payload, setPayload] = useState(null);
    const [loadError, setLoadError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setLoadError(null);
        void (async () => {
            try {
                const p = await decryptCredential(meta.encryptedCredential, meta.requestCode, meta.credentialId);
                if (!cancelled)
                    setPayload(p);
            }
            catch (e) {
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
    const conditionLabel = n10 + n11 > 0
        ? `${n10 + n11} condition${n10 + n11 === 1 ? "" : "s"} on file` +
            (n10 && n11 ? ` (${n10} ICD-10, ${n11} ICD-11)` : n11 ? " (ICD-11)" : "")
        : "—";
    const medCount = payload?.medications?.length ?? 0;
    const medLabel = medCount > 0
        ? `${medCount} medication${medCount === 1 ? "" : "s"} recorded`
        : "No medications on card";
    return (_jsxs(motion.article, { layout: true, initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { type: "spring", stiffness: 420, damping: 32 }, className: `zk-health-card ${selected ? "zk-health-card--selected" : ""}`, "data-testid": "patient-history-card", "data-selected": selected, whileHover: { y: -2 }, children: [_jsxs("button", { type: "button", className: "zk-health-card__select", onClick: onSelect, "aria-pressed": selected, "aria-label": selected ? "Selected health card" : "Select this health card for trial checks", children: [_jsx("div", { className: "zk-health-card__shine", "aria-hidden": true }), _jsxs("div", { className: "zk-health-card__top", children: [_jsxs("div", { className: "zk-health-card__chip-wrap", children: [_jsx("div", { className: "zk-health-card__chip", "aria-hidden": true }), _jsxs("div", { children: [_jsx("p", { className: "zk-health-card__label", children: "ZKClinic health card" }), _jsxs("p", { className: "zk-health-card__id", children: ["\u00B7\u00B7\u00B7\u00B7 ", meta.credentialId.slice(-4)] })] })] }), _jsxs("div", { className: "zk-health-card__score", "data-testid": "health-evidence-score", children: [_jsx("span", { className: "zk-health-card__score-value", children: revoked || expired ? "—" : score }), _jsx("span", { className: "zk-health-card__score-caption", children: "trust" })] })] }), _jsx("div", { className: "zk-health-card__strip", "aria-hidden": true }), _jsxs("div", { className: "zk-health-card__row", children: [_jsx("span", { children: "Status" }), _jsx("span", { className: "zk-health-card__chips", children: revoked ? (_jsx("span", { className: "zk-chip zk-chip--bad", children: "Revoked" })) : expired ? (_jsx("span", { className: "zk-chip zk-chip--bad", children: "Expired" })) : (_jsx("span", { className: "zk-chip zk-chip--ok", children: "Active" })) })] }), _jsxs("div", { className: "zk-health-card__row", children: [_jsx("span", { children: "Conditions" }), _jsx("span", { children: loadError ? "Could not unlock card" : conditionLabel })] }), _jsxs("div", { className: "zk-health-card__row", children: [_jsx("span", { children: "Medications" }), _jsx("span", { children: loadError ? "—" : medLabel })] }), _jsxs("div", { className: "zk-health-card__row", children: [_jsx("span", { children: "Valid until" }), _jsx("span", { children: payload
                                    ? new Date(payload.expiresAt).toLocaleDateString()
                                    : loadError
                                        ? "—"
                                        : "…" })] }), _jsxs("div", { className: "zk-health-card__row zk-health-card__row--muted", children: [_jsx("span", { children: "Stored on" }), _jsx("span", { children: "this device only" })] })] }), loadError && (_jsx("p", { className: ui.msgError, role: "alert", style: { margin: "0.75rem 0 0", fontSize: "0.8rem" }, children: loadError })), _jsxs("div", { style: { padding: "0 1rem 1rem" }, children: [_jsx("p", { className: ui.sectionTitle, style: { marginBottom: "0.35rem" }, children: "Privacy" }), _jsx(DisclosureSummary, { compact: true }), _jsx("p", { className: ui.sectionTitle, style: { margin: "1rem 0 0.35rem" }, children: "Trial proofs (this card)" }), _jsx(ProofTimeline, { credentialId: meta.credentialId, refreshKey: proofRefreshKey })] })] }));
}
