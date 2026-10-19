import { useEffect, useState } from "react";
import { getStoredCredentials } from "../credentialStorage";
import { ui } from "../ui";

const STORAGE_KEY = "zkclinic-guided-flow-dismissed";

function readDismissed(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export type GuidedFlowBannerProps = {
  walletConnected: boolean;
  contractDeployed: boolean;
};

export function GuidedFlowBanner({ walletConnected, contractDeployed }: GuidedFlowBannerProps) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [hasHealthCard, setHasHealthCard] = useState(false);

  useEffect(() => {
    const sync = () => setHasHealthCard(getStoredCredentials().length > 0);
    sync();
    const id = window.setInterval(sync, 1200);
    return () => window.clearInterval(id);
  }, []);

  if (dismissed) return null;

  const steps = [
    {
      done: contractDeployed,
      label: "Connect the clinic contract",
      hint: "Paste the contract address above (from your deploy) so the app can read on-chain state."
    },
    {
      done: hasHealthCard,
      label: "Get your health card",
      hint: "Patient tab — the card is what you match against trials with."
    },
    {
      done: walletConnected,
      label: "Wallet for on-chain steps",
      hint: "Optional until you post proofs or manage trials."
    }
  ];

  return (
    <div className="zk-guided-banner" data-testid="guided-flow-banner">
      <div className="zk-guided-banner__inner">
        <p className="zk-guided-banner__title">Path to trial matching</p>
        <ol className="zk-guided-banner__steps">
          {steps.map((s) => (
            <li key={s.label} data-done={s.done}>
              <span className="zk-guided-banner__check" aria-hidden>
                {s.done ? "✓" : "○"}
              </span>
              <span>
                <strong>{s.label}</strong>
                <span className="zk-guided-banner__hint"> — {s.hint}</span>
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={ui.btn}
          style={{ marginTop: "0.75rem", fontSize: "0.7rem" }}
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
