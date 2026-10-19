import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ui } from "../../ui";
/**
 * Explains boolean-only disclosure for trial proofs (Milestone 4).
 */
export function DisclosureSummary({ compact }) {
    if (compact) {
        return (_jsxs("p", { className: ui.msgMuted, style: { margin: 0, fontSize: "0.8125rem" }, children: [_jsx("strong", { children: "Shared with the trial:" }), " pass/fail per rule + a proof ID.", " ", _jsx("strong", { children: "Not shared:" }), " diagnosis details, labs, medications, or your identity."] }));
    }
    return (_jsxs("div", { className: ui.highlight, "data-testid": "disclosure-summary", style: { marginTop: "0.75rem" }, children: [_jsx("p", { className: ui.highlightLabel, children: "What gets disclosed" }), _jsxs("ul", { className: ui.list, style: { marginTop: "0.5rem" }, children: [_jsxs("li", { children: [_jsx("strong", { children: "Yes" }), " \u2014 eligibility results as simple pass/fail per trial rule, plus a verifiable proof ID on Midnight."] }), _jsxs("li", { children: [_jsx("strong", { children: "No" }), " \u2014 your full chart, exact diagnosis wording, lab numbers, medications, age, or name. Those stay encrypted on this device."] })] })] }));
}
