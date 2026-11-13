import "./globals";

import React from "react";
import { initNeopopTheme } from "./neopop/initNeopop";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ZKClinicProvider } from "./contexts/ZKClinicContext";
import "./index.css";
import "./styles/global.css";
import "@midnight-ntwrk/dapp-connector-api";

initNeopopTheme();

// #region agent log
function agentGlobalDebug(payload: Record<string, unknown>): void {
  fetch("http://127.0.0.1:7406/ingest/48c0bcba-7e3e-4bcf-a687-14896a47bed7", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "6053bf" },
    body: JSON.stringify({
      sessionId: "6053bf",
      timestamp: Date.now(),
      runId: "pre",
      hypothesisId: "H5",
      ...payload
    })
  }).catch(() => {});
}
window.addEventListener("error", (ev) => {
  agentGlobalDebug({
    location: "main.tsx:window.error",
    message: ev.message ?? "window error",
    data: {
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      stack: ev.error instanceof Error ? ev.error.stack?.slice(0, 1200) : undefined
    }
  });
});
window.addEventListener("unhandledrejection", (ev) => {
  const r = ev.reason;
  agentGlobalDebug({
    location: "main.tsx:unhandledrejection",
    message: r instanceof Error ? r.message : String(r),
    data: {
      stack: r instanceof Error ? r.stack?.slice(0, 1200) : undefined
    }
  });
});
// #endregion

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ZKClinicProvider>
          <App />
        </ZKClinicProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
