import { useEffect, useState } from "react";

const API_URL = (import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100").replace(/\/$/, "");

type ApiStatus = "checking" | "online" | "waking";

const LABELS: Record<ApiStatus, string> = {
  checking: "API · checking…",
  online: "API · online",
  waking: "API · waking up…"
};

/**
 * Shows whether the verification API answers. Free-tier hosting sleeps when idle, so the first
 * requests after a pause can fail for a minute — this makes that visible instead of mysterious.
 */
export function ApiStatusBadge() {
  const [status, setStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function ping() {
      let next: ApiStatus = "waking";
      try {
        const controller = new AbortController();
        const abort = window.setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
        window.clearTimeout(abort);
        if (res.ok) next = "online";
      } catch {
        /* unreachable or still booting */
      }
      if (cancelled) return;
      setStatus(next);
      timer = window.setTimeout(() => void ping(), next === "online" ? 30_000 : 6_000);
    }

    void ping();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <span
      className={`zk-api-badge zk-api-badge--${status}`}
      role="status"
      data-testid="api-status"
      title={
        status === "waking"
          ? "The verification API is hosted on a free tier and may take up to a minute to wake after idle time."
          : `Verification API: ${API_URL}`
      }
    >
      <span className="zk-api-dot" aria-hidden />
      {LABELS[status]}
    </span>
  );
}
