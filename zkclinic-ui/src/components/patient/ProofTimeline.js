import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { getStoredProofs } from "../../proofStorage";
import { ui } from "../../ui";
import { formatShortId, proofExpiresInLabel } from "./patientCardUtils";
export function ProofTimeline({ credentialId, refreshKey }) {
    const proofs = useMemo(() => {
        return getStoredProofs()
            .filter((p) => p.credentialId.toLowerCase() === credentialId.toLowerCase())
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [credentialId, refreshKey]);
    if (proofs.length === 0) {
        return (_jsx("p", { className: ui.msgMuted, "data-testid": "proof-timeline-empty", style: { margin: "0.5rem 0 0" }, children: "No trial proofs yet. When you apply, only a proof ID and rule results are shared \u2014 not your record." }));
    }
    return (_jsx("ul", { className: ui.list, "data-testid": "proof-timeline", style: { marginTop: "0.5rem" }, children: proofs.map((p) => {
            const expired = Date.now() > p.expiresAt;
            return (_jsxs("li", { children: [_jsx("strong", { children: p.trialTitle }), _jsxs("span", { className: ui.msgMuted, style: { display: "block", fontSize: "0.75rem", marginTop: 4 }, children: ["Proof ", _jsx("code", { className: ui.code, children: formatShortId(p.proofId, 6, 6) }), " · ", "Pseudonym ", _jsx("code", { className: ui.code, children: formatShortId(p.pseudonym, 4, 4) }), " · ", expired ? (_jsx("span", { style: { color: "var(--zk-danger)" }, children: "Expired \u2014 regenerate if needed" })) : (_jsxs(_Fragment, { children: ["Valid ", proofExpiresInLabel(p.expiresAt), " (30-day window)"] }))] }), _jsxs("span", { className: ui.msgMuted, style: { display: "block", fontSize: "0.7rem", marginTop: 2 }, children: ["Rules: ", p.criterionResults.filter((c) => c.passed).length, "/", p.criterionResults.length, " passed"] })] }, p.proofId));
        }) }));
}
