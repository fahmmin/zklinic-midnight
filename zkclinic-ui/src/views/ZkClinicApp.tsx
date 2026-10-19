import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_NMC_DOCTOR_ID,
  DEMO_NMC_REGISTRATION_NO,
  DEMO_OCR_NAME_HINT,
  DEMO_OCR_SMC_HINT
} from "../lib/demoWorkspaceMocks";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { OPEN_COMMAND_PALETTE_EVENT } from "../components/CommandPalette";
import { GuidedFlowBanner } from "../components/GuidedFlowBanner";
import { ShieldLeafIcon, SparkGridIcon } from "../components/illustrations/ZkClinicSvgs";
import {
  defaultContractAddressFromEnv,
  shouldAutoJoinContract,
  showDevToolsPanel
} from "../lib/envContract";
import { formatMidnightNetworkLabel, viteMidnightNetworkId } from "../lib/buildNetwork";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { useTheme } from "../contexts/ThemeContext";
import { useZKClinic } from "../contexts/ZKClinicContext";
import { PatientView } from "./PatientView";
import { DoctorView } from "./DoctorView";
import { TrialManagerView } from "./TrialManagerView";
import { ContractStateView } from "./ContractStateView";
import { Moon, Sun } from "lucide-react";
import { ui } from "../ui";

type Tab = "patient" | "doctor" | "trials" | "contract";

const VALID_TABS: Tab[] = ["patient", "doctor", "trials", "contract"];

function isAppTab(s: string | undefined): s is Tab {
  return s !== undefined && VALID_TABS.includes(s as Tab);
}

const STATUS_LABELS: Record<number, string> = {
  0: "None",
  1: "Pending",
  2: "Approved",
  3: "Revoked"
};

const BUILD_MIDNIGHT_NETWORK_ID = viteMidnightNetworkId();
const BUILD_MIDNIGHT_NETWORK_LABEL = formatMidnightNetworkLabel(BUILD_MIDNIGHT_NETWORK_ID);

const JOIN_ADDRESS_STORAGE_KEY = "zkclinic-join-contract-address";

function readStoredJoinAddress(): string {
  try {
    const v = localStorage.getItem(JOIN_ADDRESS_STORAGE_KEY);
    return v?.trim() ?? "";
  } catch {
    return "";
  }
}

export function ZkClinicApp() {
  const { theme, toggleTheme } = useTheme();
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (section === "registry") {
      navigate("/app/doctor", { replace: true });
      return;
    }
    if (!isAppTab(section)) {
      navigate("/app/patient", { replace: true });
    }
  }, [section, navigate]);

  const tab: Tab = isAppTab(section) ? section : "patient";
  const [impureCircuitNames, setImpureCircuitNames] = useState<string[]>([]);
  const [circuitCatalogError, setCircuitCatalogError] = useState<string | null>(null);
  const [zkAssetProbe, setZkAssetProbe] = useState<{
    proverStatus: number | null;
    bzkirStatus: number | null;
    probeError: string | null;
  }>({ proverStatus: null, bzkirStatus: null, probeError: null });

  useEffect(() => {
    const base = `${window.location.origin}/zkclinic`;
    void fetch(`${base}/compiler/contract-info.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ circuits?: Array<{ name: string; pure?: boolean }> }>;
      })
      .then((j) => {
        const names = (j.circuits ?? [])
          .filter((c) => !c.pure)
          .map((c) => c.name);
        setImpureCircuitNames(names);
        setCircuitCatalogError(null);
      })
      .catch((e: unknown) => {
        setImpureCircuitNames([]);
        setCircuitCatalogError(e instanceof Error ? e.message : String(e));
      });

    const probe = async () => {
      try {
        const [proverRes, bzkirRes] = await Promise.all([
          fetch(`${base}/keys/submitIssuerRequest.prover`, { method: "HEAD" }),
          fetch(`${base}/zkir/submitIssuerRequest.bzkir`, { method: "HEAD" })
        ]);
        setZkAssetProbe({
          proverStatus: proverRes.status,
          bzkirStatus: bzkirRes.status,
          probeError: null
        });
      } catch (e: unknown) {
        setZkAssetProbe({
          proverStatus: null,
          bzkirStatus: null,
          probeError: e instanceof Error ? e.message : String(e)
        });
      }
    };
    void probe();
  }, []);

  const {
    expectedNetworkId,
    walletNetworkId,
    isConnecting,
    status,
    contractAddress,
    error,
    stateRefreshError,
    state,
    walletAddress,
    walletConnectorName,
    flowMessage,
    connect,
    join,
    refreshState,
    approveIssuer,
    finalizeIssuerReview,
    revokeIssuer,
    walletDoctorKeyHex
  } = useZKClinic();

  const VERIFICATION_API = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

  const [joinAddress, setJoinAddress] = useState(() => {
    const stored = readStoredJoinAddress();
    const fromEnv = defaultContractAddressFromEnv();
    return stored || fromEnv;
  });
  const [doctorToApprove, setDoctorToApprove] = useState("");
  const [doctorToRevoke, setDoctorToRevoke] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [nmcDoctorId, setNmcDoctorId] = useState(DEMO_NMC_DOCTOR_ID);
  const [nmcRegNo, setNmcRegNo] = useState(DEMO_NMC_REGISTRATION_NO);
  const [ocrNameHint, setOcrNameHint] = useState(DEMO_OCR_NAME_HINT);
  const [ocrSmcHint, setOcrSmcHint] = useState(DEMO_OCR_SMC_HINT);
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [useNmcOnApprove, setUseNmcOnApprove] = useState(true);

  useEffect(() => {
    if (walletDoctorKeyHex && doctorToApprove.trim() === "") {
      setDoctorToApprove(walletDoctorKeyHex);
    }
  }, [walletDoctorKeyHex, doctorToApprove]);

  useEffect(() => {
    try {
      const v = joinAddress.trim();
      if (v) localStorage.setItem(JOIN_ADDRESS_STORAGE_KEY, v);
      else localStorage.removeItem(JOIN_ADDRESS_STORAGE_KEY);
    } catch {
      /* ignore quota / private mode */
    }
  }, [joinAddress]);

  const handleConnect = async () => {
    setActionError(null);
    try {
      await connect();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const lower = raw.toLowerCase();
      if (lower.includes("network") && lower.includes("mismatch")) {
        setActionError(
          friendlyErrorMessage(
            `Network mismatch: this build expects VITE_NETWORK_ID=${expectedNetworkId}. ` +
              "Switch your wallet to that network, or set VITE_NETWORK_ID to match the wallet in `.env.preview` / `.env.preprod` / `.env.undeployed` or `.env.local`, then rebuild."
          )
        );
      } else {
        setActionError(friendlyErrorMessage(raw));
      }
    }
  };

  const handleJoin = async () => {
    setActionError(null);
    if (!joinAddress.trim()) {
      setActionError("Enter contract address");
      return;
    }
    try {
      await join(joinAddress.trim());
    } catch (e) {
      setActionError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    }
  };

  const handleApprove = async () => {
    setActionError(null);
    setPendingReviewId(null);
    const key = doctorToApprove.trim();
    if (!key) {
      setActionError("Enter doctor public key (32-byte hex)");
      return;
    }
    try {
      const nmc =
        useNmcOnApprove && nmcDoctorId.trim() && nmcRegNo.trim()
          ? {
              doctorId: nmcDoctorId.trim(),
              regdNoValue: nmcRegNo.trim(),
              ocrNameHint: ocrNameHint.trim() || undefined,
              ocrSmcHint: ocrSmcHint.trim() || undefined
            }
          : undefined;
      await approveIssuer(key, nmc ? { nmcVerification: nmc } : undefined);
      setDoctorToApprove("");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const rid = raw.match(/reviewId:\s*([a-f0-9]+)/i);
      if (rid) setPendingReviewId(rid[1] ?? null);
      setActionError(friendlyErrorMessage(raw));
    }
  };

  const handleFinalizeReview = async () => {
    setActionError(null);
    if (!pendingReviewId || !doctorToApprove.trim()) {
      setActionError("Need review id and doctor key");
      return;
    }
    try {
      await finalizeIssuerReview(pendingReviewId, doctorToApprove.trim());
      setPendingReviewId(null);
      setDoctorToApprove("");
    } catch (e) {
      setActionError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    }
  };

  const handleRevoke = async () => {
    setActionError(null);
    const key = doctorToRevoke.trim();
    if (!key) {
      setActionError("Enter doctor public key (32-byte hex)");
      return;
    }
    try {
      await revokeIssuer(key);
      setDoctorToRevoke("");
    } catch (e) {
      setActionError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
    }
  };

  const isConnected = !!walletAddress;
  const isDeployed = status === "deployed";

  const envContractHint = defaultContractAddressFromEnv();

  const willAutoJoinWithValidAddress = useMemo(() => {
    if (!shouldAutoJoinContract()) return false;
    const raw = joinAddress.trim().replace(/^0x/i, "");
    return raw.length >= 64;
  }, [joinAddress]);

  const autoJoinRunRef = useRef(false);

  useEffect(() => {
    if (!shouldAutoJoinContract()) return;
    const raw = joinAddress.trim().replace(/^0x/i, "");
    if (raw.length < 64) return;
    if (status === "deployed" || status === "in-progress") return;
    const doneKey = `zkclinic-autojoin-ok-${raw}`;
    try {
      if (sessionStorage.getItem(doneKey) === "1") return;
    } catch {
      /* ignore */
    }
    if (autoJoinRunRef.current) return;
    autoJoinRunRef.current = true;
    let cancelled = false;
    setActionError(null);
    void (async () => {
      try {
        await join(raw);
        if (!cancelled) {
          try {
            sessionStorage.setItem(doneKey, "1");
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        if (!cancelled) {
          autoJoinRunRef.current = false;
          setActionError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
      }
    })();
    return () => {
      cancelled = true;
      autoJoinRunRef.current = false;
    };
  }, [joinAddress, status, join]);

  return (
    <div className={ui.app} data-testid="zkclinic-app">
      <header className={ui.header}>
        <div className={ui.headerInner}>
          <Link
            to="/"
            className={ui.btn}
            style={{ alignSelf: "center" }}
            data-testid="btn-back-landing"
          >
            ← Home
          </Link>
          <div className={ui.brand}>
            <div className={ui.brandMark} data-testid="brand-title">
              ZK<span>linic</span>
            </div>
            <p className={ui.tagline}>
              Clinical trial matching powered by your on-device health card — staff tools stay out of the main path.
            </p>
          </div>
          <div className="zk-header-actions">
            <span className="zk-network-badge" data-testid="build-midnight-network" title="VITE_NETWORK_ID for this build">
              Midnight · {BUILD_MIDNIGHT_NETWORK_LABEL}
            </span>
            <button
              type="button"
              className="zk-palette-trigger"
              data-testid="btn-open-palette"
              onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
              aria-label="Open command palette"
            >
              <span>Quick actions</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button
              type="button"
              className="zk-theme-toggle"
              data-testid="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? (
                <>
                  <Moon size={16} strokeWidth={2.25} aria-hidden />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun size={16} strokeWidth={2.25} aria-hidden />
                  <span>Light</span>
                </>
              )}
            </button>
            <nav className={ui.nav} aria-label="Primary">
              <NavLink to="/app/patient" className={ui.tab} data-testid="tab-patient" end>
                Patient
              </NavLink>
              <NavLink to="/app/doctor" className={ui.tab} data-testid="tab-doctor">
                Doctor
              </NavLink>
              <NavLink to="/app/trials" className={ui.tab} data-testid="tab-trials">
                Trial programs
              </NavLink>
              <NavLink to="/app/contract" className={ui.tab} data-testid="tab-contract">
                Contract
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      <main className={ui.shell}>
        <GuidedFlowBanner walletConnected={isConnected} contractDeployed={isDeployed} />

        {tab === "patient" && (
          <section className="zk-app-mission" data-testid="app-architecture" aria-label="Product architecture">
            <div className="zk-app-mission__layout">
              <div className="zk-app-mission__inner">
                <p className="zk-app-mission__eyebrow">Main feature</p>
                <h2 className="zk-app-mission__title">Clinical trial matching</h2>
                <p className="zk-app-mission__body">
                  The <strong>patient health card</strong> is the product centerpiece — a doctor-backed credential on your
                  device that lets you <strong>privately check fit</strong> against open trials. Trial managers define
                  criteria; doctors attest what belongs on the card; patients match and prove eligibility without handing
                  over their full chart.
                </p>
                <ul className="zk-app-mission__roles" aria-label="Who uses ZKClinic">
                  <li>
                    <span className="zk-app-mission__role-label">Patients</span>
                    <span className="zk-app-mission__role-hint">Card, browse trials, match &amp; prove</span>
                  </li>
                  <li>
                    <span className="zk-app-mission__role-label">Doctors</span>
                    <span className="zk-app-mission__role-hint">Issue the card that powers matching</span>
                  </li>
                  <li>
                    <span className="zk-app-mission__role-label">Trial managers</span>
                    <span className="zk-app-mission__role-hint">Publish criteria and enrollment</span>
                  </li>
                </ul>
              </div>
              <div className="zk-app-mission__art">
                <SparkGridIcon className="zk-mission-spark" />
                <ShieldLeafIcon className="zk-mission-shield" />
              </div>
            </div>
          </section>
        )}

        {tab === "patient" && (
          <p className={ui.lead} style={{ marginTop: "1.25rem" }} data-testid="hero-lead">
            Connect your wallet and paste the clinic contract address below when you are ready. Your health card and
            trial matching live on the <strong>Patient</strong> tab. Doctors and trial sponsors use their own tabs;
            on-chain summaries are on <strong>Contract</strong>. Site administrators approve new issuers under{" "}
            <strong>Doctor</strong> → Site administration.
          </p>
        )}
        {tab === "doctor" && (
          <p className={ui.lead} style={{ marginTop: "1.25rem" }} data-testid="hero-lead-doctor">
            Issue and update patient cards, request verification, and (when you are an admin) approve or revoke issuers
            in <strong>Site administration</strong> at the bottom of this tab.
          </p>
        )}
        {tab === "trials" && (
          <p className={ui.lead} style={{ marginTop: "1.25rem" }} data-testid="hero-lead-trials">
            Define trial criteria, publish on-chain, and track enrollment. Patients match against these programs from
            the Patient tab.
          </p>
        )}
        {tab === "contract" && (
          <p className={ui.lead} style={{ marginTop: "1.25rem" }} data-testid="hero-lead-contract">
            Read-only view of what the indexer sees on-chain: contract address, issuers, trials, and related counters.
            Administrative actions stay on the Doctor tab.
          </p>
        )}

        {showDevToolsPanel() && (
        <section className={ui.section} data-testid="section-zk-circuits" aria-label="ZK circuits and static assets">
          <div className={ui.sectionInner}>
            <p className={ui.sectionTitle}>ZK</p>
            <h2 className={ui.h2}>On-chain circuits & static assets</h2>
            <p className={ui.msgMuted} style={{ marginBottom: "0.75rem" }}>
              This contract uses <strong>vacant witnesses</strong> (no separate <code className={ui.code}>witnesses.ts</code>{" "}
              in the browser bundle). Proofs load from <code className={ui.code}>/zkclinic/keys/*.prover</code> and{" "}
              <code className={ui.code}>/zkclinic/zkir/*.bzkir</code> after{" "}
              <code className={ui.code}>npm run copy-contract-assets</code> — same role as example-zkloan’s{" "}
              <code className={ui.code}>/keys</code> and <code className={ui.code}>/zkir</code> at the site root.
            </p>
            {impureCircuitNames.length > 0 ? (
              <ul className={ui.stackSm} style={{ marginBottom: "0.75rem", paddingLeft: "1.25rem" }}>
                {impureCircuitNames.map((name) => (
                  <li key={name}>
                    <code className={ui.code}>{name}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={ui.msgMuted} data-testid="circuit-catalog-empty">
                {circuitCatalogError
                  ? `Could not load contract-info.json (${circuitCatalogError}). Run copy-contract-assets and refresh.`
                  : "Loading circuit list…"}
              </p>
            )}
            <p className={ui.msgMuted} style={{ marginBottom: "0.25rem" }}>
              Sample artifact reachability (HEAD):{" "}
              <code className={ui.code}>submitIssuerRequest.prover</code> →{" "}
              {zkAssetProbe.proverStatus != null ? (
                <span data-testid="probe-prover">{zkAssetProbe.proverStatus}</span>
              ) : (
                "—"
              )}
              {", "}
              <code className={ui.code}>submitIssuerRequest.bzkir</code> →{" "}
              {zkAssetProbe.bzkirStatus != null ? (
                <span data-testid="probe-bzkir">{zkAssetProbe.bzkirStatus}</span>
              ) : (
                "—"
              )}
            </p>
            {zkAssetProbe.probeError && (
              <p className={ui.msgError} role="alert" data-testid="probe-error">
                {zkAssetProbe.probeError}
              </p>
            )}
            <p className={ui.msgMuted}>
              On-chain calls still require a successful <strong>Connect</strong>. If join throws before providers are
              ready, the UI cannot call circuits even when static files return 200.
            </p>
          </div>
        </section>
        )}

        <section className={ui.section} data-testid="section-wallet">
          <div className={ui.sectionInner}>
            <p className={ui.sectionTitle}>Wallet</p>
            <h2 className={ui.h2}>Connect wallet</h2>
            <p className={ui.msgMuted} style={{ marginBottom: "0.75rem" }}>
              {willAutoJoinWithValidAddress
                ? "Auto-join is enabled — your wallet will open when the contract connection runs."
                : "Connect your wallet first (Lace or 1AM). Then use Connect contract below with the registry address."}
            </p>
            {!isConnected ? (
              <button
                type="button"
                className={ui.btn}
                data-testid="btn-connect"
                onClick={handleConnect}
                disabled={status === "in-progress" || isConnecting}
              >
                {isConnecting ? "Connecting…" : "Connect wallet"}
              </button>
            ) : (
              <div className={ui.stackSm} data-testid="wallet-connected">
                <p className={ui.msg}>
                  Connected
                  {walletConnectorName ? (
                    <>
                      {" "}
                      via <strong>{walletConnectorName}</strong>
                    </>
                  ) : null}{" "}
                  <code className={ui.code}>{walletAddress?.slice(0, 24)}…</code>
                </p>
                {walletNetworkId && (
                  <p className={ui.msgMuted} data-testid="wallet-network-id">
                    Network: <code className={ui.code}>{walletNetworkId}</code>
                    {walletNetworkId.toLowerCase() !== expectedNetworkId.toLowerCase() && (
                      <span className={ui.warnInline}>
                        {" "}
                        (build expects <code className={ui.code}>{expectedNetworkId}</code> — align the wallet network
                        or rebuild with matching <code className={ui.code}>VITE_NETWORK_ID</code>)
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {!isDeployed && (
          <section className={ui.section} data-testid="section-contract">
            <div className={ui.sectionInner}>
              <p className={ui.sectionTitle}>Contract</p>
              <h2 className={ui.h2}>Contract connection</h2>
              {envContractHint ? (
                <p className={ui.msgMuted} data-testid="contract-env-hint" style={{ marginBottom: "0.75rem" }}>
                  Default from <code className={ui.code}>VITE_CONTRACT_ADDRESS</code> when set. The value is{" "}
                  <strong>saved in this browser</strong> when you edit it.
                  {shouldAutoJoinContract() ? (
                    <>
                      {" "}
                      Auto-join is <strong>on</strong> (
                      <code className={ui.code}>VITE_AUTO_JOIN_CONTRACT</code> or{" "}
                      <code className={ui.code}>VITE_AUTO_CONNECT</code>
                      ).
                    </>
                  ) : null}
                </p>
              ) : (
                <p className={ui.msgMuted} style={{ marginBottom: "0.75rem" }}>
                  Enter the registry contract address (saved on this device), or set{" "}
                  <code className={ui.code}>VITE_CONTRACT_ADDRESS</code> in your env file for a build-time default. Deploy
                  with <code className={ui.code}>zkclinic-cli</code>.
                </p>
              )}
              {!isConnected && status !== "in-progress" && (
                <p className={ui.msgMuted} style={{ marginBottom: "0.75rem" }} data-testid="contract-connect-wallet-hint">
                  Connect your wallet above to enable <strong>Connect contract</strong>.
                </p>
              )}
              {status === "in-progress" ? (
                <p className={ui.msgFlow} data-testid="flow-message">
                  {flowMessage ?? "Working…"}
                </p>
              ) : (
                <div className={ui.inputRow}>
                  <input
                    className={ui.input}
                    placeholder="Contract address (e.g. 0100… or 64 hex)"
                    value={joinAddress}
                    onChange={(e) => setJoinAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isConnected && joinAddress.trim()) void handleJoin();
                    }}
                    data-testid="input-contract-address"
                  />
                  {isConnected ? (
                    <button
                      type="button"
                      className={ui.btnPrimary}
                      data-testid="btn-contract-connect"
                      onClick={handleJoin}
                      disabled={!joinAddress.trim()}
                    >
                      Connect contract
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        )}

        {(error || actionError) && (
          <p className={ui.msgError} data-testid="error-message" role="alert">
            {error?.message ?? actionError}
          </p>
        )}

        {stateRefreshError && status === "deployed" && (
          <p className={ui.msgMuted} data-testid="state-refresh-warning" role="status">
            Ledger view: {stateRefreshError} — try <strong>Refresh state</strong> after the indexer catches up.
          </p>
        )}

        {tab === "patient" && <PatientView />}
        {tab === "doctor" && <DoctorView />}
        {tab === "trials" && <TrialManagerView />}

        {tab === "contract" && (
          <>
            {!isDeployed || !contractAddress ? (
              <section className={ui.section} data-testid="section-contract-gate">
                <div className={ui.sectionInner}>
                  <p className={ui.sectionTitle}>Contract</p>
                  <h2 className={ui.h2}>Connect a contract first</h2>
                  <p className={ui.msgMuted}>
                    Use the wallet and contract fields above to join this clinic deployment. This tab then shows a
                    read-only summary of on-chain issuers, pending requests, and trials.
                  </p>
                </div>
              </section>
            ) : (
              <ContractStateView
                contractAddress={contractAddress}
                state={state}
                onRefresh={() => void refreshState()}
              />
            )}
          </>
        )}

        {isDeployed && contractAddress && tab === "doctor" && (
          <>
            <section className={ui.section} data-testid="section-issuer-registration-api">
              <div className={ui.sectionInner}>
                <p className={ui.sectionTitle}>Site administration</p>
                <h2 className={ui.h2}>Issuer onboarding</h2>
                <p className={ui.lead} style={{ maxWidth: "58ch" }}>
                  Doctors use the <strong>Register as a doctor</strong> panel above (IMR excerpt + PDF) for the only
                  off-chain issuer registration path. After they submit on-chain, use <strong>Approve issuer</strong>{" "}
                  below. Open the <strong>Contract</strong> tab for a read-only ledger summary.
                </p>
              </div>
            </section>

            <section className={ui.section} data-testid="section-approve">
              <div className={ui.sectionInner}>
                <p className={ui.sectionTitle}>Admin</p>
                <h2 className={ui.h2}>Approve issuer</h2>
                <p className={ui.lead}>Requires verification API + attestation.</p>
                <div className={ui.inputRow}>
                  <input
                    className={ui.input}
                    placeholder="Doctor public key (hex)"
                    value={doctorToApprove}
                    onChange={(e) => setDoctorToApprove(e.target.value)}
                    data-testid="input-approve-doctor"
                  />
                  <button
                    type="button"
                    className={ui.btnPrimary}
                    data-testid="btn-approve"
                    onClick={handleApprove}
                    disabled={!doctorToApprove.trim()}
                  >
                    Approve
                  </button>
                </div>
                <p className={ui.msgMuted} style={{ fontSize: "0.8125rem", marginTop: "0.75rem", maxWidth: "48ch" }}>
                  Optional: when checked, approval calls the registry check with the doctor ID and registration number
                  (align with what the doctor entered at registration).
                </p>
                <label
                  className={ui.lead}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.35rem" }}
                >
                  <input
                    type="checkbox"
                    checked={useNmcOnApprove}
                    onChange={(e) => setUseNmcOnApprove(e.target.checked)}
                  />
                  Use registry verification when approving issuer
                </label>
                <div className={ui.inputRow} style={{ marginTop: "0.5rem" }}>
                  <input
                    className={ui.input}
                    placeholder="Doctor ID (IMR)"
                    value={nmcDoctorId}
                    onChange={(e) => setNmcDoctorId(e.target.value)}
                    data-testid="input-nmc-doctor-id"
                  />
                  <input
                    className={ui.input}
                    placeholder="Registration no."
                    value={nmcRegNo}
                    onChange={(e) => setNmcRegNo(e.target.value)}
                    data-testid="input-nmc-reg"
                  />
                </div>
                <div className={ui.inputRow} style={{ marginTop: "0.5rem" }}>
                  <input
                    className={ui.input}
                    placeholder="Name hint (optional)"
                    value={ocrNameHint}
                    onChange={(e) => setOcrNameHint(e.target.value)}
                  />
                  <input
                    className={ui.input}
                    placeholder="Council hint (optional)"
                    value={ocrSmcHint}
                    onChange={(e) => setOcrSmcHint(e.target.value)}
                  />
                </div>
                {state && state.pending.length > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p className={ui.msgMuted} style={{ fontSize: "0.8125rem", marginBottom: "0.35rem" }}>
                      Pending requests (fill approve field)
                    </p>
                    <ul className={ui.list}>
                      {state.pending.map((p, i) => (
                        <li key={`pend-${p.doctor}-${i}`}>
                          <code className={ui.code}>{p.doctor.slice(0, 18)}…</code>
                          <button
                            type="button"
                            className={ui.btn}
                            style={{ marginLeft: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.65rem" }}
                            onClick={() => setDoctorToApprove(p.doctor)}
                          >
                            Use →
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pendingReviewId && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p className={ui.msgMuted} style={{ fontSize: "0.8125rem" }}>
                      Pending manual review: <code className={ui.code}>{pendingReviewId}</code>. Set{" "}
                      <code className={ui.code}>VITE_ZKCLINIC_ADMIN_TOKEN</code> to match the API, then finalize.
                    </p>
                    <button
                      type="button"
                      className={ui.btnPrimary}
                      data-testid="btn-finalize-review"
                      onClick={() => void handleFinalizeReview()}
                    >
                      Finalize after review
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className={ui.section} data-testid="section-revoke-issuer">
              <div className={ui.sectionInner}>
                <p className={ui.sectionTitle}>Admin</p>
                <h2 className={ui.h2}>Revoke issuer</h2>
                <div className={ui.inputRow}>
                  <input
                    className={ui.input}
                    placeholder="Doctor public key (hex)"
                    value={doctorToRevoke}
                    onChange={(e) => setDoctorToRevoke(e.target.value)}
                    data-testid="input-revoke-doctor"
                  />
                  <button
                    type="button"
                    className={ui.btn}
                    data-testid="btn-revoke-issuer"
                    onClick={handleRevoke}
                    disabled={!doctorToRevoke.trim()}
                  >
                    Revoke
                  </button>
                </div>
                {state && state.issuers.length > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p className={ui.msgMuted} style={{ fontSize: "0.8125rem", marginBottom: "0.35rem" }}>
                      Issuers (fill revoke field)
                    </p>
                    <ul className={ui.list}>
                      {state.issuers.map((row, idx) => (
                        <li key={`iss-${row.doctor}-${idx}`}>
                          <code className={ui.code}>{row.doctor.slice(0, 18)}…</code>{" "}
                          <span className={ui.msgMuted} style={{ fontSize: "0.75rem" }}>
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                          <button
                            type="button"
                            className={ui.btn}
                            style={{ marginLeft: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.65rem" }}
                            onClick={() => setDoctorToRevoke(row.doctor)}
                          >
                            Use →
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className={ui.footer} data-testid="footer">
        Evidence on-chain · Clinical data stays on device ·{" "}
        <strong>Midnight</strong>
      </footer>
    </div>
  );
}
