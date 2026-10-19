import { motion } from "framer-motion";
import { Play } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { HeroDashboard } from "../components/landing/HeroDashboard";
import { MarketingNav } from "../components/landing/MarketingNav";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background" data-testid="landing-page">
      <MarketingNav />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-hidden">
          <div className="flex shrink-0 flex-col items-center px-4 pt-2 md:pt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 font-body text-sm text-muted-foreground"
            >
              Most trials miss recruitment deadlines—the patients were there all along
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-xl text-center font-display text-5xl leading-[0.95] tracking-tight text-foreground md:text-6xl lg:text-[5rem]"
            >
              Get found for the trial.{" "}
              <span className="italic text-foreground">Keep</span> your records.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 max-w-[650px] text-center font-body text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              Today, joining a study often means handing your whole medical story to a sponsor you’ve never met.
              ZKClinic flips that: your doctor’s credential stays on your device, you prove eligibility in
              plain yes-or-no answers, and the sponsor sees nothing else.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-5 flex items-center gap-3"
            >
              <Button
                type="button"
                className="rounded-full px-6 py-5 text-sm font-medium font-body"
                onClick={() => void navigate("/app/patient")}
                data-testid="hero-launch-app"
              >
                Launch app
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-11 rounded-full border-0 bg-background p-0 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80"
                aria-label="Play product overview"
              >
                <Play className="h-4 w-4 fill-foreground text-foreground" aria-hidden />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
