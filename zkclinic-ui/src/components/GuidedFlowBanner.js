import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getStoredCredentials } from "../credentialStorage";
import { ui } from "../ui";
const STORAGE_KEY = "zkclinic-guided-flow-dismissed";
function readDismissed() {
    try {
        return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
    }
    catch {
        return false;
    }
}
export function GuidedFlowBanner({ walletConnected, contractDeployed }) {
    const [dismissed, setDismissed] = useState(readDismissed);
    const [hasHealthCard, setHasHealthCard] = useState(false);
    useEffect(() => {
        const sync = () => setHasHealthCard(getStoredCredentials().length > 0);
        sync();
        const id = window.setInterval(sync, 1200);
        return () => window.clearInterval(id);
    }, []);
    if (dismissed)
        return null;
    const steps = [
        {
            done: contractDeployed,
            label: "Connect the clinic contract",
            hint: "Paste the contract address above (from your deploy) so the app can read on-chain state."
        },
        {
            done: hasHealthCard,
            label: "Get your health card",
            hint: "Patient tab — the card is what you match against trials with."
        },
        {
            done: walletConnected,
            label: "Wallet for on-chain steps",
            hint: "Optional until you post proofs or manage trials."
        }
    ];
    return (_jsx("div", { className: "zk-guided-banner", "data-testid": "guided-flow-banner", children: _jsxs("div", { className: "zk-guided-banner__inner", children: [_jsx("p", { className: "zk-guided-banner__title", children: "Path to trial matching" }), _jsx("ol", { className: "zk-guided-banner__steps", children: steps.map((s) => (_jsxs("li", { "data-done": s.done, children: [_jsx("span", { className: "zk-guided-banner__check", "aria-hidden": true, children: s.done ? "✓" : "○" }), _jsxs("span", { children: [_jsx("strong", { children: s.label }), _jsxs("span", { className: "zk-guided-banner__hint", children: [" \u2014 ", s.hint] })] })] }, s.label))) }), _jsx("button", { type: "button", className: ui.btn, style: { marginTop: "0.75rem", fontSize: "0.7rem" }, onClick: () => {
                        try {
                            localStorage.setItem(STORAGE_KEY, "1");
                        }
                        catch {
                            /* ignore */
                        }
                        setDismissed(true);
                    }, children: "Dismiss" })] }) }));
}
