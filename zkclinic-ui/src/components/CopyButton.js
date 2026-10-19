import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
/** Small "Copy" button that confirms with "Copied ✓" for a moment. */
export function CopyButton({ value, label = "Copy", "data-testid": testId }) {
    const [state, setState] = useState("idle");
    useEffect(() => {
        if (state === "idle")
            return;
        const t = window.setTimeout(() => setState("idle"), 1800);
        return () => window.clearTimeout(t);
    }, [state]);
    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            setState("copied");
        }
        catch {
            setState("failed");
        }
    }
    return (_jsx("button", { type: "button", className: "zk-copy-btn", onClick: () => void copy(), "aria-live": "polite", "data-testid": testId, children: state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : label }));
}
