import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

export function MarketingNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith("/docs") ? "docs" : pathname.startsWith("/about") ? "about" : "home";

  const item = (isActive: boolean) =>
    isActive
      ? "text-sm font-medium text-foreground"
      : "text-sm text-muted-foreground transition-colors hover:text-foreground";

  const goContact = () => {
    if (pathname !== "/about") {
      void navigate("/about#contact");
      return;
    }
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="flex shrink-0 items-center justify-between px-6 py-5 font-body md:px-12 lg:px-20">
      <button
        type="button"
        className="text-left text-xl font-semibold tracking-tight text-foreground"
        onClick={() => void navigate("/")}
      >
        ✦ ZKlinic
      </button>
      <nav className="hidden items-center gap-8 md:flex" aria-label="Marketing">
        <button type="button" className={item(active === "home")} onClick={() => void navigate("/")}>
          Home
        </button>
        <button type="button" className={item(active === "docs")} onClick={() => void navigate("/docs")}>
          Docs
        </button>
        <button type="button" className={item(active === "about")} onClick={() => void navigate("/about")}>
          About
        </button>
        <button type="button" className={item(false)} onClick={goContact}>
          Contact
        </button>
      </nav>
      <Button
        type="button"
        className="rounded-full px-5 text-sm font-medium"
        onClick={() => void navigate("/app/patient")}
        data-testid="nav-launch-app"
      >
        Launch app
      </Button>
    </header>
  );
}
