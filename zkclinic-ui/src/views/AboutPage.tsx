import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MarketingNav } from "../components/landing/MarketingNav";

export function AboutPage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash !== "#contact") return;
    const t = window.setTimeout(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="about-page">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-6 md:px-12 md:pt-10">
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">Why ZKClinic exists</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Clinical research’s most expensive problem isn’t a lack of eligible people—it’s that finding them
          usually starts with “send us everything.”
        </p>

        <section className="mt-12 space-y-4">
          <h2 className="font-display text-2xl tracking-tight">The gap</h2>
          <p className="leading-relaxed text-muted-foreground">
            Most trials fall behind on recruitment. Not because patients don’t exist—but because the path to
            “you qualify” has been “hand your entire record to a company you’ve never met.” That bargain breaks
            trust before the first visit.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What we’re building</h2>
          <p className="leading-relaxed text-muted-foreground">
            A doctor-signed health credential lives on the patient’s device—it never sits on our servers. When
            someone applies to a study, ZKClinic generates a proof that checks their credential against the
            trial’s criteria. What lands on Midnight’s public ledger is the minimum: issuer validity, a
            yes-or-no per rule, and a binding to that trial—not diagnoses, labs, meds, or identity.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            The recruiter sees exactly what they need to move forward: criterion-by-criterion eligibility,
            backed by a licensed physician and cryptography they can verify themselves.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What we are not</h2>
          <p className="leading-relaxed text-muted-foreground">
            ZKClinic is not a diagnostic tool. It is not a medical records product. It is trust
            infrastructure—so a patient can prove they qualify without becoming a data feed for whoever runs
            the trial.
          </p>
        </section>

        <section id="contact" className="mt-14 scroll-mt-24 space-y-4 rounded-2xl border border-border bg-secondary/40 p-6 md:p-8">
          <h2 className="font-display text-2xl tracking-tight">Contact</h2>
          <p className="leading-relaxed text-muted-foreground">
            Building in public on Midnight. For protocol questions, integrations, or research partnerships, use
            the channels you already trust in this ecosystem—we’ll meet you there.
          </p>
        </section>
      </main>
    </div>
  );
}
