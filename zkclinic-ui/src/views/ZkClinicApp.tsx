import { useEffect, useRef, useState } from "react";
import {
  DEMO_NMC_DOCTOR_ID,
  DEMO_NMC_REGISTRATION_NO,
  DEMO_OCR_NAME_HINT,
  DEMO_OCR_SMC_HINT
} from "../lib/demoWorkspaceMocks";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { GuidedFlowBanner } from "../components/GuidedFlowBanner";
import { ShieldLeafIcon, SparkGridIcon } from "../components/illustrations/ZkClinicSvgs";
import { defaultContractAddressFromEnv, showDevToolsPanel } from "../lib/envContract";
import { formatMidnightNetworkLabel, viteMidnightNetworkId } from "../lib/buildNetwork";
import { friendlyErrorMessage } from "../lib/friendlyErrors";
import { isDemoMode, saveRole, setDemoMode, storedRole, type Role } from "../lib/role";
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
/** Set after a successful connect, so the next visit reconnects without a tap (the wallet already trusts this site). */
const RECONNECT_KEY = "zkclinic-reconnect";

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

  /** One tap: open the wallet and join the clinic contract. Falls back to the build's address if a saved one is stale. */
  const connectAndJoin = async () => {
    setActionError(null);
    const candidates = [...new Set([joinAddress.trim(), defaultContractAddressFromEnv()].filter(Boolean))];
    if (candidates.length === 0) {
      setActionError("This build has no clinic contract address. Open “Use a different contract” and paste one.");
      return;
    }
    for (const [i, address] of candidates.entries()) {
      try {
        await join(address);
        if (address !== joinAddress.trim()) setJoinAddress(address);
        try {
          localStorage.setItem(RECONNECT_KEY, "1");
        } catch {
          /* ignore */
        }
        return;
      } catch (e) {
        if (i === candidates.length - 1) {
          setActionError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
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

  const handleApprove = async (keyArg?: string) => {
    setActionError(null);
    setPendingReviewId(null);
    const key = (keyArg ?? doctorToApprove).trim();
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
  const isAdmin = !!walletDoctorKeyHex && state?.admin === walletDoctorKeyHex.toLowerCase();

  const autoConnectRan = useRef(false);
  useEffect(() => {
    if (autoConnectRan.current || status !== "idle") return;
    let returning = false;
    try {
      returning = localStorage.getItem(RECONNECT_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (!returning) return;
    autoConnectRan.current = true;
    void connectAndJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // --- Sign-in and roles: the wallet is the account; each wallet picks a role once and lands in it. ---
  const [demo, setDemo] = useState(isDemoMode);
  const [role, setRole] = useState<Role | null>(null);
  const isApprovedDoctor =
    !!walletDoctorKeyHex &&
    !!state?.issuers.some((i) => i.doctor === walletDoctorKeyHex.toLowerCase() && i.status === 2);

  useEffect(() => {
    if (!walletAddress) return setRole(null);
    // An approved doctor on-chain is a doctor, whatever this device remembers.
    setRole(isApprovedDoctor ? "doctor" : storedRole(walletAddress));
  }, [walletAddress, isApprovedDoctor]);

  useEffect(() => {
    if (demo || !role || tab === role || (tab === "contract" && isAdmin)) return;
    navigate(`/app/${role}`, { replace: true });
  }, [demo, role, tab, isAdmin, navigate]);

  const pickRole = (r: Role | null) => {
    if (!walletAddress) return;
    saveRole(walletAddress, r);
    setRole(r);
    if (r) navigate(`/app/${r}`);
  };

  const signOut = () => {
    try {
      localStorage.removeItem(RECONNECT_KEY);
    } catch {
      /* ignore */
    }
    // The wallet connector has no disconnect call; a reload drops the session.
    window.location.assign("/app");
  };

  const toggleDemo = () => {
    setDemoMode(!demo);
    setDemo(!demo);
  };
  // Long-press the logo for demo mode (role switcher for recordings); hidden from everyday users.
  const pressTimer = useRef<number | undefined>(undefined);
  const pressHandlers = {
    onPointerDown: () => {
      pressTimer.current = window.setTimeout(toggleDemo, 800);
    },
    onPointerUp: () => window.clearTimeout(pressTimer.current),
    onPointerLeave: () => window.clearTimeout(pressTimer.current)
  };

  const showRoleView = demo || (isDeployed && !!role);
  const ROLE_LABEL: Record<Role, string> = { patient: "Patient", doctor: "Doctor", trials: "Study team" };

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
          <div className={ui.brand} {...pressHandlers} style={{ userSelect: "none" }}>
            <div className={ui.brandMark} data-testid="brand-title">
              ZK<span>linic</span>
            </div>
            <p className={ui.tagline}>Prove you fit a study without sharing your records.</p>
          </div>
          <div className="zk-header-actions">
            <span className="zk-network-badge" data-testid="build-midnight-network" title="VITE_NETWORK_ID for this build">
              Midnight · {BUILD_MIDNIGHT_NETWORK_LABEL}
            </span>
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
            {demo && (
            <nav className={ui.nav} aria-label="Demo role switcher">
              <NavLink to="/app/patient" className={ui.tab} data-testid="tab-patient" end>
                Patient
              </NavLink>
              <NavLink to="/app/doctor" className={ui.tab} data-testid="tab-doctor">
                Doctor
              </NavLink>
              <NavLink to="/app/trials" className={ui.tab} data-testid="tab-trials">
                Studies
              </NavLink>
              <NavLink to="/app/contract" className={ui.tab} data-testid="tab-contract">
                Contract
              </NavLink>
              <button type="button" className={ui.tab} onClick={toggleDemo} data-testid="btn-exit-demo">
                Exit demo
              </button>
            </nav>
            )}
          </div>
        </div>
      </header>

      <main className={ui.shell}>
        {!isDeployed && (
          <Link to="/demo" className="zk-demo-link" data-testid="link-guided-demo">
            New here? Try the 1-minute demo first
          </Link>
        )}
        <details className="zk-explain" data-testid="explain-details" hidden={isDeployed && !demo}>
          <summary>How this works</summary>
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
            Tap <strong>Connect wallet</strong> once. Your health card and study matching live on the{" "}
            <strong>Patient</strong> tab; doctors and study teams use their own tabs.
          </p>
        )}
        {tab === "doctor" && (
          <p className={ui.lead} style={{ marginTop: "1.25rem" }} data-testid="hero-lead-doctor">
            Issue patient health cards. If your wallet runs the clinic, doctor approvals appear at the bottom of this
            tab.
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
        </details>

        {showDevToolsPanel() && (
        <section className={ui.section} data-testid="section-zk-circuits" aria-label="ZK circuits and static assets">
          <div className={ui.sectionInner}>
            <p className={ui.sectionTitle}>ZK</p>
            <h2 className={ui.h2}>On-chain circuits & static assets</h2>
            <p className={ui.msgMuted} style={{ marginBottom: "0.75rem" }}>
              Patient circuits read <strong>private witnesses</strong> (ZK secret key, attested attributes, Merkle
              path) from on-device private state via <code className={ui.code}>contract/src/witnesses.ts</code>. Proofs
              load from <code className={ui.code}>/zkclinic/keys/*.prover</code> and{" "}
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
            {isDeployed ? (
              <div className="zk-account" data-testid="wallet-connected">
                <p className={ui.msg}>
                  ✓ Signed in{walletConnectorName ? <> with <strong>{walletConnectorName}</strong></> : null}
                  {walletAddress ? <> · <code className={ui.code}>{walletAddress.slice(0, 10)}…</code></> : null}
                  {role ? <> · {ROLE_LABEL[role]}</> : null}
                </p>
                <div className="zk-account__actions">
                  {role && !isApprovedDoctor && (
                    <button type="button" className={ui.btn} onClick={() => pickRole(null)} data-testid="btn-change-role">
                      Change role
                    </button>
                  )}
                  <button type="button" className={ui.btn} onClick={signOut} data-testid="btn-sign-out">
                    Sign out
                  </button>
                </div>
              </div>
            ) : status === "in-progress" ? (
              <p className={ui.msgFlow} data-testid="flow-message">
                {flowMessage ?? "Signing in…"}
              </p>
            ) : (
              <>
                <h2 className={ui.h2}>Sign in with your wallet</h2>
                <p className={ui.msgMuted} style={{ marginBottom: "0.75rem" }}>
                  Your Midnight wallet is your account. No email, no password. Use 1AM on Chrome, Android or iOS,
                  or Lace on desktop.
                </p>
                <button
                  type="button"
                  className={`${ui.btnPrimary} zk-btn-block`}
                  data-testid="btn-connect"
                  onClick={() => void connectAndJoin()}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Signing in…" : "Sign in with wallet"}
                </button>
              </>
            )}
            {isConnected && walletNetworkId && walletNetworkId.toLowerCase() !== expectedNetworkId.toLowerCase() && (
              <p className={ui.warnInline} data-testid="wallet-network-id">
                Your wallet is on {walletNetworkId}; this app uses {expectedNetworkId}. Switch networks in the wallet.
              </p>
            )}
            {!isDeployed && status !== "in-progress" && (
              <details className="zk-explain" data-testid="section-contract">
                <summary>Use a different contract</summary>
                <div className={ui.inputRow}>
                  <input
                    className={ui.input}
                    placeholder="Contract address (64 hex)"
                    value={joinAddress}
                    onChange={(e) => setJoinAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && joinAddress.trim()) void handleJoin();
                    }}
                    data-testid="input-contract-address"
                  />
                  <button
                    type="button"
                    className={ui.btn}
                    data-testid="btn-contract-connect"
                    onClick={handleJoin}
                    disabled={!joinAddress.trim()}
                  >
                    Connect contract
                  </button>
                </div>
              </details>
            )}
          </div>
        </section>

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

        {isDeployed && !role && !demo && (
          <section className={ui.section} data-testid="section-role-picker">
            <div className={ui.sectionInner}>
              <h2 className={ui.h2}>What brings you here?</h2>
              <p className={ui.msgMuted} style={{ marginBottom: "0.9rem" }}>
                Pick once. The app remembers it for this wallet.
              </p>
              <div className="zk-role-picker">
                <button type="button" className="zk-role-card" onClick={() => pickRole("patient")} data-testid="role-patient">
                  <strong>I'm a patient</strong>
                  <span>Keep my health card and find studies I fit</span>
                </button>
                <button type="button" className="zk-role-card" onClick={() => pickRole("trials")} data-testid="role-trials">
                  <strong>I run a study</strong>
                  <span>Publish who can join and enroll verified patients</span>
                </button>
                <button type="button" className="zk-role-card" onClick={() => pickRole("doctor")} data-testid="role-doctor">
                  <strong>I'm a doctor</strong>
                  <span>Verify my medical ID once, then issue health cards</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {showRoleView && tab === "patient" && <PatientView />}
        {showRoleView && tab === "doctor" && <DoctorView />}
        {showRoleView && tab === "trials" && <TrialManagerView />}

        {(demo || isAdmin) && tab === "contract" && (
          <>
            {!isDeployed || !contractAddress ? (
              <section className={ui.section} data-testid="section-contract-gate">
                <div className={ui.sectionInner}>
                  <p className={ui.sectionTitle}>Contract</p>
                  <h2 className={ui.h2}>Connect a contract first</h2>
                  <p className={ui.msgMuted}>
                    Tap Connect wallet above. This tab then shows a read-only summary of on-chain issuers, pending
                    requests, and studies.
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

        {isDeployed && contractAddress && tab === "doctor" && isAdmin && (
          <>

            <section className={ui.section} data-testid="section-approve">
              <div className={ui.sectionInner}>
                <p className={ui.sectionTitle}>Admin</p>
                <h2 className={ui.h2}>Doctors waiting for approval</h2>
                {state && state.pending.length > 0 ? (
                  <ul className={ui.list} data-testid="pending-doctors">
                    {state.pending.map((p, i) => (
                      <li key={`pend-${p.doctor}-${i}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <code className={ui.code}>
                          {p.doctor === walletDoctorKeyHex?.toLowerCase() ? "You" : `${p.doctor.slice(0, 12)}…`}
                        </code>
                        <button
                          type="button"
                          className={ui.btnPrimary}
                          data-testid={`btn-approve-${i}`}
                          onClick={() => void handleApprove(p.doctor)}
                          disabled={!!flowMessage}
                        >
                          Approve
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={ui.msgMuted}>Nobody is waiting. New doctor requests appear here.</p>
                )}
                <details className="zk-explain">
                  <summary>Approve by key, or change the registry check</summary>
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
                    onClick={() => void handleApprove()}
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
                </details>
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
                <details className="zk-explain">
                <summary>Remove a doctor</summary>
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
                </details>
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
