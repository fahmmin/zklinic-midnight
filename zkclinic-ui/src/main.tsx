import "./globals";

import React from "react";
import { initNeopopTheme } from "./neopop/initNeopop";
import { createRoot } from "react-dom/client";
import { setNetworkId, type NetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ZKClinicProvider } from "./contexts/ZKClinicContext";
import "./index.css";
import "./styles/global.css";
import "@midnight-ntwrk/dapp-connector-api";

const networkId = (import.meta.env.VITE_NETWORK_ID || "preview") as NetworkId;
setNetworkId(networkId);
initNeopopTheme();

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
