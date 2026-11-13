/**
 * Admin page: deploy a fresh ZKLinic contract from the browser with the 1AM wallet. The wallet
 * proves and pays (1AM sponsors DUST), so no local proof server or long CLI wallet sync is needed.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useZKClinic } from "../contexts/ZKClinicContext";
import "../styles/guided.css";

type Wallet = {
  name: string;
  network: string;
  unshielded: string;
  dust: string;
  dustBalance: bigint;
  night: bigint;
};

const JOIN_ADDRESS_STORAGE_KEY = "zkclinic-join-contract-address";
const FAUCET: Record<string, string> = {
  preprod: "https://faucet.preprod.midnight.network",
  preview: "https://faucet.preview.midnight.network"
};

async function readWallet(expectedNetwork: string): Promise<Wallet> {
  const midnight = (window as unknown as { midnight?: Record<string, any> }).midnight;
  const api = midnight?.["1am"] ?? Object.values(midnight ?? {}).find((w) => typeof w?.connect === "function");
  if (!api) throw new Error("No Midnight wallet found. Install 1AM (1am.xyz), then reload this page.");
  const connected = await api.connect(expectedNetwork);
  const [unshielded, dust, dustBalance, balances] = await Promise.all([
    connected.getUnshieldedAddress(),
    connected.getDustAddress(),
    connected.getDustBalance(),
    connected.getUnshieldedBalances()
  ]);
  const night = Object.values(balances as Record<string, bigint>).reduce((a, b) => a + b, 0n);
  return {
    name: api.name ?? "wallet",
    network: expectedNetwork,
    unshielded: unshielded.unshieldedAddress,
    dust: dust.dustAddress,
    dustBalance: dustBalance.balance,
    night
  };
}

export function DeployPage() {
  const { deploy, expectedNetworkId, flowMessage } = useZKClinic();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const connect = async () => {
    setError(null);
    setBusy(true);
    try {
      setWallet(await readWallet(expectedNetworkId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); console.error("[ZKLinic deploy]", e);
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const addr = await deploy();
      localStorage.setItem(JOIN_ADDRESS_STORAGE_KEY, addr);
      setAddress(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); console.error("[ZKLinic deploy]", e);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  useEffect(() => {
    document.title = "Deploy ZKLinic";
  }, []);

  return (
    <div className="gd" data-testid="deploy-page">
      <header className="gd-top">
        <Link to="/" className="gd-brand">
          ZKLinic
        </Link>
        <p className="gd-progress">Network: {expectedNetworkId}</p>
      </header>

      <main className="gd-main">
        <section className="gd-step">
          <h1>Deploy the contract</h1>
          <p>
            Uses your 1AM wallet. The wallet creates the proof and pays the fee, and you become the contract admin.
          </p>

          {!wallet && (
            <div className="gd-actions">
              <button className="gd-go" onClick={connect} disabled={busy} data-testid="deploy-connect">
                {busy ? "Opening your wallet…" : "Connect 1AM wallet"}
              </button>
            </div>
          )}

          {wallet && !address && (
            <>
              <dl className="gd-card">
                <div>
                  <dt>Wallet</dt>
                  <dd>{wallet.name}</dd>
                </div>
                <div>
                  <dt>tNIGHT</dt>
                  <dd data-testid="deploy-night">{wallet.night.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>DUST</dt>
                  <dd data-testid="deploy-dust">{wallet.dustBalance.toLocaleString()}</dd>
                </div>
              </dl>
              {wallet.night === 0n && (
                <p>
                  Your wallet is empty. Copy the address below into the{" "}
                  <a href={FAUCET[wallet.network] ?? FAUCET.preprod} target="_blank" rel="noreferrer">
                    {wallet.network} faucet
                  </a>
                  , then turn on DUST generation in 1AM and reload.
                </p>
              )}
              <p style={{ overflowWrap: "anywhere", fontFamily: "var(--zk-mono)", fontSize: "0.9375rem" }}>
                {wallet.unshielded}
              </p>
              <div className="gd-actions">
                <button className="gd-go" onClick={run} disabled={busy} data-testid="deploy-run">
                  {busy ? flowMessage ?? "Deploying…" : "Deploy ZKLinic contract"}
                </button>
                <button className="gd-alt" onClick={() => copy("wallet", wallet.unshielded)}>
                  {copied === "wallet" ? "Copied" : "Copy wallet address for the faucet"}
                </button>
              </div>
            </>
          )}

          {address && (
            <>
              <h1 className="gd-yes">Deployed</h1>
              <p style={{ overflowWrap: "anywhere", fontFamily: "var(--zk-mono)" }} data-testid="deploy-address">
                {address}
              </p>
              <p>Saved on this device, so the app connects to it automatically. Put it in the README too.</p>
              <div className="gd-actions">
                <Link className="gd-go" to="/app/doctor">
                  Open the app
                </Link>
                <button className="gd-alt" onClick={() => copy("contract", address)}>
                  {copied === "contract" ? "Copied" : "Copy contract address"}
                </button>
              </div>
            </>
          )}

          {error && (
            <p role="alert" style={{ color: "var(--zk-danger)", overflowWrap: "anywhere" }} data-testid="deploy-error">
              {error}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
