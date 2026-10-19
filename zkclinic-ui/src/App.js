import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { CommandPalette } from "./components/CommandPalette";
import { AboutPage } from "./views/AboutPage";
import { DocsPage } from "./views/DocsPage";
import { LandingPage } from "./views/LandingPage";
import { ZkClinicApp } from "./views/ZkClinicApp";
export function App() {
    return (_jsxs(_Fragment, { children: [_jsx(CommandPalette, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/docs", element: _jsx(DocsPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutPage, {}) }), _jsx(Route, { path: "/app", element: _jsx(Navigate, { to: "/app/patient", replace: true }) }), _jsx(Route, { path: "/app/:section", element: _jsx(ZkClinicApp, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] })] }));
}
