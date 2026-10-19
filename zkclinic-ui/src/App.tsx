import { Navigate, Route, Routes } from "react-router-dom";
import { CommandPalette } from "./components/CommandPalette";
import { AboutPage } from "./views/AboutPage";
import { DocsPage } from "./views/DocsPage";
import { LandingPage } from "./views/LandingPage";
import { ZkClinicApp } from "./views/ZkClinicApp";

export function App() {
  return (
    <>
      <CommandPalette />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/app" element={<Navigate to="/app/patient" replace />} />
        <Route path="/app/:section" element={<ZkClinicApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
