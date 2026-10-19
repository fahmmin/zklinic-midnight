import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_NMC_DOCTOR_ID, DEMO_NMC_REGISTRATION_NO, DEMO_OCR_NAME_HINT, DEMO_OCR_SMC_HINT } from "../lib/demoWorkspaceMocks";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { OPEN_COMMAND_PALETTE_EVENT } from "../components/CommandPalette";
import { GuidedFlowBanner } from "../components/GuidedFlowBanner";
import { ShieldLeafIcon, SparkGridIcon } from "../components/illustrations/ZkClinicSvgs";
import { defaultContractAddressFromEnv, shouldAutoJoinContract, showDevToolsPanel } from "../lib/envContract";
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
const VALID_TABS = ["patient", "doctor", "trials", "contract"];
function isAppTab(s) {
    return s !== undefined && VALID_TABS.includes(s);
}
const STATUS_LABELS = {
    0: "None",
    1: "Pending",
    2: "Approved",
    3: "Revoked"
};
const BUILD_MIDNIGHT_NETWORK_ID = viteMidnightNetworkId();
const BUILD_MIDNIGHT_NETWORK_LABEL = formatMidnightNetworkLabel(BUILD_MIDNIGHT_NETWORK_ID);
const JOIN_ADDRESS_STORAGE_KEY = "zkclinic-join-contract-address";
function readStoredJoinAddress() {
    try {
        const v = localStorage.getItem(JOIN_ADDRESS_STORAGE_KEY);
        return v?.trim() ?? "";
    }
    catch {
        return "";
    }
}
export function ZkClinicApp() {
    const { theme, toggleTheme } = useTheme();
    const { section } = useParams();
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
    const tab = isAppTab(section) ? section : "patient";
    const [impureCircuitNames, setImpureCircuitNames] = useState([]);
    const [circuitCatalogError, setCircuitCatalogError] = useState(null);
    const [zkAssetProbe, setZkAssetProbe] = useState({ proverStatus: null, bzkirStatus: null, probeError: null });
    useEffect(() => {
        const base = `${window.location.origin}/zkclinic`;
        void fetch(`${base}/compiler/contract-info.json`)
            .then((r) => {
            if (!r.ok)
                throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
            .then((j) => {
            const names = (j.circuits ?? [])
                .filter((c) => !c.pure)
                .map((c) => c.name);
            setImpureCircuitNames(names);
            setCircuitCatalogError(null);
        })
            .catch((e) => {
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
            }
            catch (e) {
                setZkAssetProbe({
                    proverStatus: null,
                    bzkirStatus: null,
                    probeError: e instanceof Error ? e.message : String(e)
                });
            }
        };
        void probe();
    }, []);
    const { expectedNetworkId, walletNetworkId, isConnecting, status, contractAddress, error, stateRefreshError, state, walletAddress, walletConnectorName, flowMessage, connect, join, refreshState, approveIssuer, finalizeIssuerReview, revokeIssuer, walletDoctorKeyHex } = useZKClinic();
    const VERIFICATION_API = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";
    const [joinAddress, setJoinAddress] = useState(() => {
        const stored = readStoredJoinAddress();
        const fromEnv = defaultContractAddressFromEnv();
        return stored || fromEnv;
    });
    const [doctorToApprove, setDoctorToApprove] = useState("");
    const [doctorToRevoke, setDoctorToRevoke] = useState("");
    const [actionError, setActionError] = useState(null);
    const [nmcDoctorId, setNmcDoctorId] = useState(DEMO_NMC_DOCTOR_ID);
    const [nmcRegNo, setNmcRegNo] = useState(DEMO_NMC_REGISTRATION_NO);
    const [ocrNameHint, setOcrNameHint] = useState(DEMO_OCR_NAME_HINT);
    const [ocrSmcHint, setOcrSmcHint] = useState(DEMO_OCR_SMC_HINT);
    const [pendingReviewId, setPendingReviewId] = useState(null);
    const [useNmcOnApprove, setUseNmcOnApprove] = useState(true);
    useEffect(() => {
        if (walletDoctorKeyHex && doctorToApprove.trim() === "") {
            setDoctorToApprove(walletDoctorKeyHex);
        }
    }, [walletDoctorKeyHex, doctorToApprove]);
    useEffect(() => {
        try {
            const v = joinAddress.trim();
            if (v)
                localStorage.setItem(JOIN_ADDRESS_STORAGE_KEY, v);
            else
                localStorage.removeItem(JOIN_ADDRESS_STORAGE_KEY);
        }
        catch {
            /* ignore quota / private mode */
        }
    }, [joinAddress]);
    const handleConnect = async () => {
        setActionError(null);
        try {
            await connect();
        }
        catch (e) {
            const raw = e instanceof Error ? e.message : String(e);
            const lower = raw.toLowerCase();
            if (lower.includes("network") && lower.includes("mismatch")) {
                setActionError(friendlyErrorMessage(`Network mismatch: this build expects VITE_NETWORK_ID=${expectedNetworkId}. ` +
                    "Switch your wallet to that network, or set VITE_NETWORK_ID to match the wallet in `.env.preview` / `.env.preprod` / `.env.undeployed` or `.env.local`, then rebuild."));
            }
            else {
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
        }
        catch (e) {
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
            const nmc = useNmcOnApprove && nmcDoctorId.trim() && nmcRegNo.trim()
                ? {
                    doctorId: nmcDoctorId.trim(),
                    regdNoValue: nmcRegNo.trim(),
                    ocrNameHint: ocrNameHint.trim() || undefined,
                    ocrSmcHint: ocrSmcHint.trim() || undefined
                }
                : undefined;
            await approveIssuer(key, nmc ? { nmcVerification: nmc } : undefined);
            setDoctorToApprove("");
        }
        catch (e) {
            const raw = e instanceof Error ? e.message : String(e);
            const rid = raw.match(/reviewId:\s*([a-f0-9]+)/i);
            if (rid)
                setPendingReviewId(rid[1] ?? null);
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
        }
        catch (e) {
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
        }
        catch (e) {
            setActionError(friendlyErrorMessage(e instanceof Error ? e.message : String(e)));
        }
    };
    const isConnected = !!walletAddress;
    const isDeployed = status === "deployed";
    const envContractHint = defaultContractAddressFromEnv();
    const willAutoJoinWithValidAddress = useMemo(() => {
        if (!shouldAutoJoinContract())
            return false;
        const raw = joinAddress.trim().replace(/^0x/i, "");
        return raw.length >= 64;
    }, [joinAddress]);
    const autoJoinRunRef = useRef(false);
    useEffect(() => {
        if (!shouldAutoJoinContract())
            return;
        const raw = joinAddress.trim().replace(/^0x/i, "");
        if (raw.length < 64)
            return;
        if (status === "deployed" || status === "in-progress")
            return;
        const doneKey = `zkclinic-autojoin-ok-${raw}`;
        try {
            if (sessionStorage.getItem(doneKey) === "1")
                return;
        }
        catch {
            /* ignore */
        }
        if (autoJoinRunRef.current)
            return;
        autoJoinRunRef.current = true;
        let cancelled = false;
        setActionError(null);
        void (async () => {
            try {
                await join(raw);
                if (!cancelled) {
                    try {
                        sessionStorage.setItem(doneKey, "1");
                    }
                    catch {
                        /* ignore */
                    }
                }
            }
            catch (e) {
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
    return (_jsxs("div", { className: ui.app, "data-testid": "zkclinic-app", children: [_jsx("header", { className: ui.header, children: _jsxs("div", { className: ui.headerInner, children: [_jsx(Link, { to: "/", className: ui.btn, style: { alignSelf: "center" }, "data-testid": "btn-back-landing", children: "\u2190 Home" }), _jsxs("div", { className: ui.brand, children: [_jsxs("div", { className: ui.brandMark, "data-testid": "brand-title", children: ["ZK", _jsx("span", { children: "linic" })] }), _jsx("p", { className: ui.tagline, children: "Clinical trial matching powered by your on-device health card \u2014 staff tools stay out of the main path." })] }), _jsxs("div", { className: "zk-header-actions", children: [_jsxs("span", { className: "zk-network-badge", "data-testid": "build-midnight-network", title: "VITE_NETWORK_ID for this build", children: ["Midnight \u00B7 ", BUILD_MIDNIGHT_NETWORK_LABEL] }), _jsxs("button", { type: "button", className: "zk-palette-trigger", "data-testid": "btn-open-palette", onClick: () => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT)), "aria-label": "Open command palette", children: [_jsx("span", { children: "Quick actions" }), _jsx("kbd", { children: "Ctrl K" })] }), _jsx("button", { type: "button", className: "zk-theme-toggle", "data-testid": "theme-toggle", onClick: toggleTheme, "aria-label": theme === "light" ? "Switch to dark mode" : "Switch to light mode", title: theme === "light" ? "Dark mode" : "Light mode", children: theme === "light" ? (_jsxs(_Fragment, { children: [_jsx(Moon, { size: 16, strokeWidth: 2.25, "aria-hidden": true }), _jsx("span", { children: "Dark" })] })) : (_jsxs(_Fragment, { children: [_jsx(Sun, { size: 16, strokeWidth: 2.25, "aria-hidden": true }), _jsx("span", { children: "Light" })] })) }), _jsxs("nav", { className: ui.nav, "aria-label": "Primary", children: [_jsx(NavLink, { to: "/app/patient", className: ui.tab, "data-testid": "tab-patient", end: true, children: "Patient" }), _jsx(NavLink, { to: "/app/doctor", className: ui.tab, "data-testid": "tab-doctor", children: "Doctor" }), _jsx(NavLink, { to: "/app/trials", className: ui.tab, "data-testid": "tab-trials", children: "Trial programs" }), _jsx(NavLink, { to: "/app/contract", className: ui.tab, "data-testid": "tab-contract", children: "Contract" })] })] })] }) }), _jsxs("main", { className: ui.shell, children: [_jsx(GuidedFlowBanner, { walletConnected: isConnected, contractDeployed: isDeployed }), tab === "patient" && (_jsx("section", { className: "zk-app-mission", "data-testid": "app-architecture", "aria-label": "Product architecture", children: _jsxs("div", { className: "zk-app-mission__layout", children: [_jsxs("div", { className: "zk-app-mission__inner", children: [_jsx("p", { className: "zk-app-mission__eyebrow", children: "Main feature" }), _jsx("h2", { className: "zk-app-mission__title", children: "Clinical trial matching" }), _jsxs("p", { className: "zk-app-mission__body", children: ["The ", _jsx("strong", { children: "patient health card" }), " is the product centerpiece \u2014 a doctor-backed credential on your device that lets you ", _jsx("strong", { children: "privately check fit" }), " against open trials. Trial managers define criteria; doctors attest what belongs on the card; patients match and prove eligibility without handing over their full chart."] }), _jsxs("ul", { className: "zk-app-mission__roles", "aria-label": "Who uses ZKClinic", children: [_jsxs("li", { children: [_jsx("span", { className: "zk-app-mission__role-label", children: "Patients" }), _jsx("span", { className: "zk-app-mission__role-hint", children: "Card, browse trials, match & prove" })] }), _jsxs("li", { children: [_jsx("span", { className: "zk-app-mission__role-label", children: "Doctors" }), _jsx("span", { className: "zk-app-mission__role-hint", children: "Issue the card that powers matching" })] }), _jsxs("li", { children: [_jsx("span", { className: "zk-app-mission__role-label", children: "Trial managers" }), _jsx("span", { className: "zk-app-mission__role-hint", children: "Publish criteria and enrollment" })] })] })] }), _jsxs("div", { className: "zk-app-mission__art", children: [_jsx(SparkGridIcon, { className: "zk-mission-spark" }), _jsx(ShieldLeafIcon, { className: "zk-mission-shield" })] })] }) })), tab === "patient" && (_jsxs("p", { className: ui.lead, style: { marginTop: "1.25rem" }, "data-testid": "hero-lead", children: ["Connect your wallet and paste the clinic contract address below when you are ready. Your health card and trial matching live on the ", _jsx("strong", { children: "Patient" }), " tab. Doctors and trial sponsors use their own tabs; on-chain summaries are on ", _jsx("strong", { children: "Contract" }), ". Site administrators approve new issuers under", " ", _jsx("strong", { children: "Doctor" }), " \u2192 Site administration."] })), tab === "doctor" && (_jsxs("p", { className: ui.lead, style: { marginTop: "1.25rem" }, "data-testid": "hero-lead-doctor", children: ["Issue and update patient cards, request verification, and (when you are an admin) approve or revoke issuers in ", _jsx("strong", { children: "Site administration" }), " at the bottom of this tab."] })), tab === "trials" && (_jsx("p", { className: ui.lead, style: { marginTop: "1.25rem" }, "data-testid": "hero-lead-trials", children: "Define trial criteria, publish on-chain, and track enrollment. Patients match against these programs from the Patient tab." })), tab === "contract" && (_jsx("p", { className: ui.lead, style: { marginTop: "1.25rem" }, "data-testid": "hero-lead-contract", children: "Read-only view of what the indexer sees on-chain: contract address, issuers, trials, and related counters. Administrative actions stay on the Doctor tab." })), showDevToolsPanel() && (_jsx("section", { className: ui.section, "data-testid": "section-zk-circuits", "aria-label": "ZK circuits and static assets", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "ZK" }), _jsx("h2", { className: ui.h2, children: "On-chain circuits & static assets" }), _jsxs("p", { className: ui.msgMuted, style: { marginBottom: "0.75rem" }, children: ["This contract uses ", _jsx("strong", { children: "vacant witnesses" }), " (no separate ", _jsx("code", { className: ui.code, children: "witnesses.ts" }), " ", "in the browser bundle). Proofs load from ", _jsx("code", { className: ui.code, children: "/zkclinic/keys/*.prover" }), " and", " ", _jsx("code", { className: ui.code, children: "/zkclinic/zkir/*.bzkir" }), " after", " ", _jsx("code", { className: ui.code, children: "npm run copy-contract-assets" }), " \u2014 same role as example-zkloan\u2019s", " ", _jsx("code", { className: ui.code, children: "/keys" }), " and ", _jsx("code", { className: ui.code, children: "/zkir" }), " at the site root."] }), impureCircuitNames.length > 0 ? (_jsx("ul", { className: ui.stackSm, style: { marginBottom: "0.75rem", paddingLeft: "1.25rem" }, children: impureCircuitNames.map((name) => (_jsx("li", { children: _jsx("code", { className: ui.code, children: name }) }, name))) })) : (_jsx("p", { className: ui.msgMuted, "data-testid": "circuit-catalog-empty", children: circuitCatalogError
                                        ? `Could not load contract-info.json (${circuitCatalogError}). Run copy-contract-assets and refresh.`
                                        : "Loading circuit list…" })), _jsxs("p", { className: ui.msgMuted, style: { marginBottom: "0.25rem" }, children: ["Sample artifact reachability (HEAD):", " ", _jsx("code", { className: ui.code, children: "submitIssuerRequest.prover" }), " \u2192", " ", zkAssetProbe.proverStatus != null ? (_jsx("span", { "data-testid": "probe-prover", children: zkAssetProbe.proverStatus })) : ("—"), ", ", _jsx("code", { className: ui.code, children: "submitIssuerRequest.bzkir" }), " \u2192", " ", zkAssetProbe.bzkirStatus != null ? (_jsx("span", { "data-testid": "probe-bzkir", children: zkAssetProbe.bzkirStatus })) : ("—")] }), zkAssetProbe.probeError && (_jsx("p", { className: ui.msgError, role: "alert", "data-testid": "probe-error", children: zkAssetProbe.probeError })), _jsxs("p", { className: ui.msgMuted, children: ["On-chain calls still require a successful ", _jsx("strong", { children: "Connect" }), ". If join throws before providers are ready, the UI cannot call circuits even when static files return 200."] })] }) })), _jsx("section", { className: ui.section, "data-testid": "section-wallet", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Wallet" }), _jsx("h2", { className: ui.h2, children: "Connect wallet" }), _jsx("p", { className: ui.msgMuted, style: { marginBottom: "0.75rem" }, children: willAutoJoinWithValidAddress
                                        ? "Auto-join is enabled — your wallet will open when the contract connection runs."
                                        : "Connect your wallet first (Lace or 1AM). Then use Connect contract below with the registry address." }), !isConnected ? (_jsx("button", { type: "button", className: ui.btn, "data-testid": "btn-connect", onClick: handleConnect, disabled: status === "in-progress" || isConnecting, children: isConnecting ? "Connecting…" : "Connect wallet" })) : (_jsxs("div", { className: ui.stackSm, "data-testid": "wallet-connected", children: [_jsxs("p", { className: ui.msg, children: ["Connected", walletConnectorName ? (_jsxs(_Fragment, { children: [" ", "via ", _jsx("strong", { children: walletConnectorName })] })) : null, " ", _jsxs("code", { className: ui.code, children: [walletAddress?.slice(0, 24), "\u2026"] })] }), walletNetworkId && (_jsxs("p", { className: ui.msgMuted, "data-testid": "wallet-network-id", children: ["Network: ", _jsx("code", { className: ui.code, children: walletNetworkId }), walletNetworkId.toLowerCase() !== expectedNetworkId.toLowerCase() && (_jsxs("span", { className: ui.warnInline, children: [" ", "(build expects ", _jsx("code", { className: ui.code, children: expectedNetworkId }), " \u2014 align the wallet network or rebuild with matching ", _jsx("code", { className: ui.code, children: "VITE_NETWORK_ID" }), ")"] }))] }))] }))] }) }), !isDeployed && (_jsx("section", { className: ui.section, "data-testid": "section-contract", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Contract" }), _jsx("h2", { className: ui.h2, children: "Contract connection" }), envContractHint ? (_jsxs("p", { className: ui.msgMuted, "data-testid": "contract-env-hint", style: { marginBottom: "0.75rem" }, children: ["Default from ", _jsx("code", { className: ui.code, children: "VITE_CONTRACT_ADDRESS" }), " when set. The value is", " ", _jsx("strong", { children: "saved in this browser" }), " when you edit it.", shouldAutoJoinContract() ? (_jsxs(_Fragment, { children: [" ", "Auto-join is ", _jsx("strong", { children: "on" }), " (", _jsx("code", { className: ui.code, children: "VITE_AUTO_JOIN_CONTRACT" }), " or", " ", _jsx("code", { className: ui.code, children: "VITE_AUTO_CONNECT" }), ")."] })) : null] })) : (_jsxs("p", { className: ui.msgMuted, style: { marginBottom: "0.75rem" }, children: ["Enter the registry contract address (saved on this device), or set", " ", _jsx("code", { className: ui.code, children: "VITE_CONTRACT_ADDRESS" }), " in your env file for a build-time default. Deploy with ", _jsx("code", { className: ui.code, children: "zkclinic-cli" }), "."] })), !isConnected && status !== "in-progress" && (_jsxs("p", { className: ui.msgMuted, style: { marginBottom: "0.75rem" }, "data-testid": "contract-connect-wallet-hint", children: ["Connect your wallet above to enable ", _jsx("strong", { children: "Connect contract" }), "."] })), status === "in-progress" ? (_jsx("p", { className: ui.msgFlow, "data-testid": "flow-message", children: flowMessage ?? "Working…" })) : (_jsxs("div", { className: ui.inputRow, children: [_jsx("input", { className: ui.input, placeholder: "Contract address (e.g. 0100\u2026 or 64 hex)", value: joinAddress, onChange: (e) => setJoinAddress(e.target.value), onKeyDown: (e) => {
                                                if (e.key === "Enter" && isConnected && joinAddress.trim())
                                                    void handleJoin();
                                            }, "data-testid": "input-contract-address" }), isConnected ? (_jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-contract-connect", onClick: handleJoin, disabled: !joinAddress.trim(), children: "Connect contract" })) : null] }))] }) })), (error || actionError) && (_jsx("p", { className: ui.msgError, "data-testid": "error-message", role: "alert", children: error?.message ?? actionError })), stateRefreshError && status === "deployed" && (_jsxs("p", { className: ui.msgMuted, "data-testid": "state-refresh-warning", role: "status", children: ["Ledger view: ", stateRefreshError, " \u2014 try ", _jsx("strong", { children: "Refresh state" }), " after the indexer catches up."] })), tab === "patient" && _jsx(PatientView, {}), tab === "doctor" && _jsx(DoctorView, {}), tab === "trials" && _jsx(TrialManagerView, {}), tab === "contract" && (_jsx(_Fragment, { children: !isDeployed || !contractAddress ? (_jsx("section", { className: ui.section, "data-testid": "section-contract-gate", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Contract" }), _jsx("h2", { className: ui.h2, children: "Connect a contract first" }), _jsx("p", { className: ui.msgMuted, children: "Use the wallet and contract fields above to join this clinic deployment. This tab then shows a read-only summary of on-chain issuers, pending requests, and trials." })] }) })) : (_jsx(ContractStateView, { contractAddress: contractAddress, state: state, onRefresh: () => void refreshState() })) })), isDeployed && contractAddress && tab === "doctor" && (_jsxs(_Fragment, { children: [_jsx("section", { className: ui.section, "data-testid": "section-issuer-registration-api", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Site administration" }), _jsx("h2", { className: ui.h2, children: "Issuer onboarding" }), _jsxs("p", { className: ui.lead, style: { maxWidth: "58ch" }, children: ["Doctors use the ", _jsx("strong", { children: "Register as a doctor" }), " panel above (IMR excerpt + PDF) for the only off-chain issuer registration path. After they submit on-chain, use ", _jsx("strong", { children: "Approve issuer" }), " ", "below. Open the ", _jsx("strong", { children: "Contract" }), " tab for a read-only ledger summary."] })] }) }), _jsx("section", { className: ui.section, "data-testid": "section-approve", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Admin" }), _jsx("h2", { className: ui.h2, children: "Approve issuer" }), _jsx("p", { className: ui.lead, children: "Requires verification API + attestation." }), _jsxs("div", { className: ui.inputRow, children: [_jsx("input", { className: ui.input, placeholder: "Doctor public key (hex)", value: doctorToApprove, onChange: (e) => setDoctorToApprove(e.target.value), "data-testid": "input-approve-doctor" }), _jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-approve", onClick: handleApprove, disabled: !doctorToApprove.trim(), children: "Approve" })] }), _jsx("p", { className: ui.msgMuted, style: { fontSize: "0.8125rem", marginTop: "0.75rem", maxWidth: "48ch" }, children: "Optional: when checked, approval calls the registry check with the doctor ID and registration number (align with what the doctor entered at registration)." }), _jsxs("label", { className: ui.lead, style: { display: "flex", alignItems: "center", gap: 8, marginTop: "0.35rem" }, children: [_jsx("input", { type: "checkbox", checked: useNmcOnApprove, onChange: (e) => setUseNmcOnApprove(e.target.checked) }), "Use registry verification when approving issuer"] }), _jsxs("div", { className: ui.inputRow, style: { marginTop: "0.5rem" }, children: [_jsx("input", { className: ui.input, placeholder: "Doctor ID (IMR)", value: nmcDoctorId, onChange: (e) => setNmcDoctorId(e.target.value), "data-testid": "input-nmc-doctor-id" }), _jsx("input", { className: ui.input, placeholder: "Registration no.", value: nmcRegNo, onChange: (e) => setNmcRegNo(e.target.value), "data-testid": "input-nmc-reg" })] }), _jsxs("div", { className: ui.inputRow, style: { marginTop: "0.5rem" }, children: [_jsx("input", { className: ui.input, placeholder: "Name hint (optional)", value: ocrNameHint, onChange: (e) => setOcrNameHint(e.target.value) }), _jsx("input", { className: ui.input, placeholder: "Council hint (optional)", value: ocrSmcHint, onChange: (e) => setOcrSmcHint(e.target.value) })] }), state && state.pending.length > 0 && (_jsxs("div", { style: { marginTop: "0.75rem" }, children: [_jsx("p", { className: ui.msgMuted, style: { fontSize: "0.8125rem", marginBottom: "0.35rem" }, children: "Pending requests (fill approve field)" }), _jsx("ul", { className: ui.list, children: state.pending.map((p, i) => (_jsxs("li", { children: [_jsxs("code", { className: ui.code, children: [p.doctor.slice(0, 18), "\u2026"] }), _jsx("button", { type: "button", className: ui.btn, style: { marginLeft: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.65rem" }, onClick: () => setDoctorToApprove(p.doctor), children: "Use \u2192" })] }, `pend-${p.doctor}-${i}`))) })] })), pendingReviewId && (_jsxs("div", { style: { marginTop: "0.75rem" }, children: [_jsxs("p", { className: ui.msgMuted, style: { fontSize: "0.8125rem" }, children: ["Pending manual review: ", _jsx("code", { className: ui.code, children: pendingReviewId }), ". Set", " ", _jsx("code", { className: ui.code, children: "VITE_ZKCLINIC_ADMIN_TOKEN" }), " to match the API, then finalize."] }), _jsx("button", { type: "button", className: ui.btnPrimary, "data-testid": "btn-finalize-review", onClick: () => void handleFinalizeReview(), children: "Finalize after review" })] }))] }) }), _jsx("section", { className: ui.section, "data-testid": "section-revoke-issuer", children: _jsxs("div", { className: ui.sectionInner, children: [_jsx("p", { className: ui.sectionTitle, children: "Admin" }), _jsx("h2", { className: ui.h2, children: "Revoke issuer" }), _jsxs("div", { className: ui.inputRow, children: [_jsx("input", { className: ui.input, placeholder: "Doctor public key (hex)", value: doctorToRevoke, onChange: (e) => setDoctorToRevoke(e.target.value), "data-testid": "input-revoke-doctor" }), _jsx("button", { type: "button", className: ui.btn, "data-testid": "btn-revoke-issuer", onClick: handleRevoke, disabled: !doctorToRevoke.trim(), children: "Revoke" })] }), state && state.issuers.length > 0 && (_jsxs("div", { style: { marginTop: "0.75rem" }, children: [_jsx("p", { className: ui.msgMuted, style: { fontSize: "0.8125rem", marginBottom: "0.35rem" }, children: "Issuers (fill revoke field)" }), _jsx("ul", { className: ui.list, children: state.issuers.map((row, idx) => (_jsxs("li", { children: [_jsxs("code", { className: ui.code, children: [row.doctor.slice(0, 18), "\u2026"] }), " ", _jsx("span", { className: ui.msgMuted, style: { fontSize: "0.75rem" }, children: STATUS_LABELS[row.status] ?? row.status }), _jsx("button", { type: "button", className: ui.btn, style: { marginLeft: "0.5rem", padding: "0.35rem 0.5rem", fontSize: "0.65rem" }, onClick: () => setDoctorToRevoke(row.doctor), children: "Use \u2192" })] }, `iss-${row.doctor}-${idx}`))) })] }))] }) })] }))] }), _jsxs("footer", { className: ui.footer, "data-testid": "footer", children: ["Evidence on-chain \u00B7 Clinical data stays on device \u00B7", " ", _jsx("strong", { children: "Midnight" })] })] }));
}
