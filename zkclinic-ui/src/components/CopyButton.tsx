import { useEffect, useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
  "data-testid"?: string;
};

/** Small "Copy" button that confirms with "Copied ✓" for a moment. */
export function CopyButton({ value, label = "Copy", "data-testid": testId }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      className="zk-copy-btn"
      onClick={() => void copy()}
      aria-live="polite"
      data-testid={testId}
    >
      {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
