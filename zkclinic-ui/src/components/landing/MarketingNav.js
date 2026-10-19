import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
export function MarketingNav() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const active = pathname.startsWith("/docs") ? "docs" : pathname.startsWith("/about") ? "about" : "home";
    const item = (isActive) => isActive
        ? "text-sm font-medium text-foreground"
        : "text-sm text-muted-foreground transition-colors hover:text-foreground";
    const goContact = () => {
        if (pathname !== "/about") {
            void navigate("/about#contact");
            return;
        }
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    };
    return (_jsxs("header", { className: "flex shrink-0 items-center justify-between px-6 py-5 font-body md:px-12 lg:px-20", children: [_jsx("button", { type: "button", className: "text-left text-xl font-semibold tracking-tight text-foreground", onClick: () => void navigate("/"), children: "\u2726 ZKlinic" }), _jsxs("nav", { className: "hidden items-center gap-8 md:flex", "aria-label": "Marketing", children: [_jsx("button", { type: "button", className: item(active === "home"), onClick: () => void navigate("/"), children: "Home" }), _jsx("button", { type: "button", className: item(active === "docs"), onClick: () => void navigate("/docs"), children: "Docs" }), _jsx("button", { type: "button", className: item(active === "about"), onClick: () => void navigate("/about"), children: "About" }), _jsx("button", { type: "button", className: item(false), onClick: goContact, children: "Contact" })] }), _jsx(Button, { type: "button", className: "rounded-full px-5 text-sm font-medium", onClick: () => void navigate("/app/patient"), "data-testid": "nav-launch-app", children: "Launch app" })] }));
}
