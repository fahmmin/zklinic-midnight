import { Navigate, Route, Routes } from "react-router-dom";
import { AboutPage } from "./views/AboutPage";
import { DeployPage } from "./views/DeployPage";
import { DocsPage } from "./views/DocsPage";
import { GuidedDemo } from "./views/GuidedDemo";
import { LandingPage } from "./views/LandingPage";
import { ZkClinicApp } from "./views/ZkClinicApp";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<GuidedDemo />} />
      <Route path="/deploy" element={<DeployPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/app" element={<Navigate to="/app/patient" replace />} />
      <Route path="/app/:section" element={<ZkClinicApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
