import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type { PatientIntakeV1 } from "../credential";
import { Buffer } from "buffer";
import { type ContractAddress } from "@midnight-ntwrk/compact-runtime";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { findDeployedContract, submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId, type NetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { assertIsContractAddress, parseCoinPublicKeyToHex } from "@midnight-ntwrk/midnight-js-utils";
import {
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  take,
  throwError,
  timeout,
  TimeoutError
} from "rxjs";
import type {
  InitialAPI,
  ConnectedAPI,
  Configuration
} from "@midnight-ntwrk/dapp-connector-api";
import type {
  LogLevel,
  LoggerProvider,
  MidnightProvider,
  PrivateStateProvider,
  UnboundTransaction,
  WalletProvider
} from "@midnight-ntwrk/midnight-js-types";
import { ZKClinic } from "zkclinic-contract";
import { upsertStoredCredential } from "../credentialStorage";

const NETWORK_ID = import.meta.env.VITE_NETWORK_ID || "preview";
const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

/**
 * midnight-js `scoped()` uses `loggerProvider?.error?.call(...)`. Some bundlers/wallets surface
 * "Cannot read properties of undefined (reading 'call')" if `error` is missing or not a function.
 * Provide a full no-op {@link LoggerProvider}.
 */
const noopLoggerProvider: LoggerProvider = {
  isLevelEnabled: (_level: LogLevel) => false,
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  fatal: () => {}
};

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function hexToUint8Array(hex: string): Uint8Array {
  const cleaned = hex.replace(/^0x/, "");
  const pairs = cleaned.match(/.{1,2}/g);
  if (!pairs) return new Uint8Array();
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

/** 32-byte contract address as 64 lowercase hex chars (paste-friendly: strips `0x`, left-pads). */
function normalizeContractAddressHex(input: string): string {
  const trimmed = input.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
    throw new Error("Contract address must be hexadecimal.");
  }
  if (trimmed.length > 64) {
    throw new Error("Contract address is too long (expected at most 64 hex characters).");
  }
  return trimmed.padStart(64, "0").toLowerCase();
}

/**
 * Midnight dApp connector v4: wallets live on `window.midnight` (e.g. `mnLace`, `1am`, UUID keys).
 * Prefer Lace, then 1AM, then any other injector that exposes `connect`.
 */
function listMidnightWalletApis(): InitialAPI[] {
  const midnight = (window as unknown as { midnight?: Record<string, unknown> }).midnight;
  if (!midnight) return [];
  const seen = new Set<unknown>();
  const ordered: InitialAPI[] = [];
  const add = (w: unknown): void => {
    if (w == null || seen.has(w)) return;
    if (typeof (w as InitialAPI).connect !== "function") return;
    seen.add(w);
    ordered.push(w as InitialAPI);
  };
  add(midnight.mnLace);
  add(midnight["1am"]);
  for (const v of Object.values(midnight)) add(v);
  return ordered;
}

/**
 * Doctor / issuer key hex from `getShieldedAddresses().shieldedCoinPublicKey`.
 * Wallets may return Bech32m (dApp connector spec) or 64-char hex; `parseCoinPublicKeyToHex` handles both.
 */
function shieldedCoinPublicKeyToDoctorKeyHex(pk: unknown, zswapNetworkId: NetworkId): string | null {
  if (pk == null) return null;
  if (typeof pk === "string") {
    const s = pk.trim();
    if (!s) return null;
    try {
      return parseCoinPublicKeyToHex(s, zswapNetworkId).replace(/^0x/i, "").toLowerCase();
    } catch {
      return null;
    }
  }
  if (pk instanceof Uint8Array) {
    return pk.length === 32 ? uint8ArrayToHex(pk) : null;
  }
  if (typeof ArrayBuffer !== "undefined" && pk instanceof ArrayBuffer) {
    const u = new Uint8Array(pk);
    return u.length === 32 ? uint8ArrayToHex(u) : null;
  }
  try {
    return uint8ArrayToHex(ledger.encodeCoinPublicKey(pk as ledger.CoinPublicKey));
  } catch {
    return null;
  }
}

/**
 * Browser UI: same pattern as example-zkloan — in-memory private state + signing keys for the SPA session.
 * Avoids `levelPrivateStateProvider` (Level + Node crypto in the bundle), which is a common source of
 * fragile behavior across wallets and polyfills.
 */
function inMemoryPrivateStateProvider<PSI extends string, PS>(): PrivateStateProvider<PSI, PS> {
  const states = new Map<string, PS>();
  const signingKeys = new Map<string, unknown>();
  let contractAddress: string | null = null;

  const scopedKey = (key: PSI): string => (contractAddress ? `${contractAddress}:${key}` : key);

  return {
    setContractAddress(address: ContractAddress): void {
      contractAddress =
        typeof address === "string"
          ? address.replace(/^0x/i, "").toLowerCase()
          : uint8ArrayToHex(address as unknown as Uint8Array);
    },
    async get(key: PSI): Promise<PS | null> {
      return states.get(scopedKey(key)) ?? null;
    },
    async set(key: PSI, value: PS): Promise<void> {
      states.set(scopedKey(key), value);
    },
    async remove(key: PSI): Promise<void> {
      states.delete(scopedKey(key));
    },
    async clear(): Promise<void> {
      states.clear();
    },
    async setSigningKey(address: ContractAddress, signingKey: unknown): Promise<void> {
      const k =
        typeof address === "string"
          ? address.replace(/^0x/i, "").toLowerCase()
          : uint8ArrayToHex(address as unknown as Uint8Array);
      signingKeys.set(k, signingKey);
    },
    async getSigningKey(address: ContractAddress): Promise<unknown | null> {
      const k =
        typeof address === "string"
          ? address.replace(/^0x/i, "").toLowerCase()
          : uint8ArrayToHex(address as unknown as Uint8Array);
      return signingKeys.get(k) ?? null;
    },
    async removeSigningKey(address: ContractAddress): Promise<void> {
      const k =
        typeof address === "string"
          ? address.replace(/^0x/i, "").toLowerCase()
          : uint8ArrayToHex(address as unknown as Uint8Array);
      signingKeys.delete(k);
    },
    async clearSigningKeys(): Promise<void> {
      signingKeys.clear();
    },
    async exportPrivateStates() {
      throw new Error("Export not supported in in-memory provider");
    },
    async importPrivateStates() {
      throw new Error("Import not supported in in-memory provider");
    }
  } as PrivateStateProvider<PSI, PS>;
}

const baseContract = CompiledContract.make<ZKClinic.Contract<undefined>>("ZKClinic", ZKClinic.Contract);
const withVacant = CompiledContract.withVacantWitnesses(baseContract);

export type DeploymentStatus = "idle" | "in-progress" | "deployed" | "failed";

/** Milestone 3: On-chain trial (status: 0=Open, 1=Closed, 2=Full). */
export type TrialLedgerEntry = {
  trialId: string;
  manager: string;
  slotsTotal: bigint;
  slotsFilled: bigint;
  deadline: bigint;
  status: number;
  criteriaHash: string;
  /** Basis points: 7500 = 75% minimum match (non-exclusion criteria). */
  eligibilityThresholdBps: bigint;
};

export type ZKClinicState = {
  admin: string;
  pending: Array<{ doctor: string; hash: string }>;
  issuers: Array<{
    doctor: string;
    hash: string;
    attestationHash: string;
    issuerVerificationHash: string;
    status: number;
  }>;
  revokedCredentialIds: string[];
  trials: TrialLedgerEntry[];
};

export interface ZKClinicContextValue {
  /** Build-time target from `VITE_NETWORK_ID` (Lace should match; see README). */
  expectedNetworkId: string;
  /** Wallet-reported network after connect; null until connected. */
  walletNetworkId: string | null;
  isConnecting: boolean;
  status: DeploymentStatus;
  contractAddress: string | null;
  error: Error | null;
  /** Non-fatal: indexer/ledger decode failed after deploy/join; contract may still be usable. */
  stateRefreshError: string | null;
  state: ZKClinicState | null;
  walletAddress: string | null;
  /** dApp-connector wallet name (e.g. Lace, 1AM), when available. */
  walletConnectorName: string | null;
  walletDoctorKeyHex: string | null;
  flowMessage: string | null;
  connect: () => Promise<void>;
  /** Join an existing contract by address (same model as example-zkloan UI — deploy via CLI). */
  join: (address: string) => Promise<void>;
  /** Returns whether indexer state was decoded successfully (false = see `stateRefreshError`). */
  refreshState: () => Promise<boolean>;
  submitRequest: (licenseHashHex: string) => Promise<void>;
  approveIssuer: (
    doctorPubKeyHex: string,
    opts?: {
      nmcVerification?: {
        doctorId: string;
        regdNoValue: string;
        ocrNameHint?: string;
        ocrSmcHint?: string;
      };
    }
  ) => Promise<void>;
  finalizeIssuerReview: (reviewId: string, doctorPubKeyHex: string) => Promise<void>;
  revokeIssuer: (doctorPubKeyHex: string) => Promise<void>;
  registerCredential: (credentialIdHex: string) => Promise<void>;
  /** On-chain diagnosis timeline slot for an existing card (same issuing doctor). */
  appendDiagnosisToCredential: (credentialIdHex: string, entryCommitmentHex: string) => Promise<void>;
  revokeCredential: (credentialIdHex: string) => Promise<void>;
  createCredentialRequest: (
    patientId?: string,
    patientIntake?: PatientIntakeV1,
    continuingCredentialIdHex?: string
  ) => Promise<{ requestCode: string }>;
  fetchCredentialRequest: (code: string) => Promise<{
    requestId: string;
    hasCredential: boolean;
    patientIntake?: PatientIntakeV1;
    hasPatientIntake?: boolean;
    continuingCredentialId?: string;
    hasContinuingCredentialId?: boolean;
  }>;
  deliverCredential: (
    code: string,
    encryptedCredential: string,
    credentialIdHex: string
  ) => Promise<void>;
  fetchAndStoreCredential: (code: string) => Promise<void>;
  /** Milestone 3 */
  createTrial: (
    trialIdHex: string,
    slotsTotal: bigint,
    deadlineMs: bigint,
    criteriaHashHex: string,
    eligibilityThresholdBps?: bigint
  ) => Promise<void>;
  closeTrial: (trialIdHex: string) => Promise<void>;
  recordEnrollment: (trialIdHex: string) => Promise<void>;
}

const ZKClinicContext = createContext<ZKClinicContextValue | undefined>(undefined);

export function useZKClinic(): ZKClinicContextValue {
  const ctx = useContext(ZKClinicContext);
  if (!ctx) throw new Error("useZKClinic must be used within ZKClinicProvider");
  return ctx;
}

function normalizeDoctorKey(input: string): string {
  const trimmed = input.trim().replace(/^0x/i, "");
  const match = trimmed.match(/doctor=([0-9a-fA-F]{64})/);
  return (match ? match[1] : trimmed).toLowerCase();
}

type WalletConnectResult = {
  wallet: ConnectedAPI;
  config: Configuration;
  networkId: string;
  walletName: string | undefined;
};

export function ZKClinicProvider({ children }: PropsWithChildren): React.ReactElement {
  const browserPrivateStateProvider = useMemo(
    () => inMemoryPrivateStateProvider<string, undefined>(),
    []
  );

  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [stateRefreshError, setStateRefreshError] = useState<string | null>(null);
  const [state, setState] = useState<ZKClinicState | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnectorName, setWalletConnectorName] = useState<string | null>(null);
  const [walletDoctorKeyHex, setWalletDoctorKeyHex] = useState<string | null>(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [walletNetworkId, setWalletNetworkId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const providersRef = useRef<{
    publicDataProvider: Awaited<ReturnType<typeof indexerPublicDataProvider>>;
    proofProvider: Awaited<ReturnType<typeof httpClientProofProvider>>;
    walletProvider: WalletProvider;
    midnightProvider: MidnightProvider;
    zkConfigProvider: unknown;
    privateStateProvider: PrivateStateProvider;
  } | null>(null);
  const contractAddressRef = useRef<ContractAddress | null>(null);

  const zkConfigPath = `${window.location.origin}/zkclinic`;

  /**
   * Same pattern as example-zkloan: poll for `window.midnight`, connect, sync global network id.
   * Used for the Connect button and for join (fresh wallet + config each time).
   */
  const connectToWallet = useCallback((): Promise<WalletConnectResult> => {
    return firstValueFrom(
      interval(100).pipe(
        map(() => {
          const apis = listMidnightWalletApis();
          return apis[0];
        }),
        filter((initialAPI): initialAPI is InitialAPI => !!initialAPI),
        take(1),
        timeout({
          first: 5_000,
          with: () =>
            throwError(
              () =>
                new Error(
                  "No Midnight dApp connector found. Install a Midnight-compatible wallet extension and refresh."
                )
            )
        }),
        concatMap(async (initialAPI) => {
          const walletName = initialAPI.name;
          try {
            const connectedAPI = await initialAPI.connect(NETWORK_ID);
            const config = await connectedAPI.getConfiguration();
            const connStatus = await connectedAPI.getConnectionStatus();
            const networkId =
              connStatus.status === "connected" ? connStatus.networkId : config.networkId;
            setNetworkId(networkId);
            return { wallet: connectedAPI, config, networkId, walletName };
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            if (errorMessage.includes("Network ID mismatch")) {
              throw new Error(
                `Network mismatch: dApp requests "${NETWORK_ID}" but the wallet is on a different network.`
              );
            }
            throw e instanceof Error ? e : new Error(errorMessage);
          }
        }),
        catchError((error) => {
          if (error instanceof TimeoutError) {
            return throwError(
              () =>
                new Error(
                  "No Midnight dApp connector found. Install a Midnight-compatible wallet extension and refresh."
                )
            );
          }
          return throwError(() => (error instanceof Error ? error : new Error(String(error))));
        })
      )
    );
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || walletAddress) return;

    setIsConnecting(true);
    setFlowMessage("Looking for a Midnight wallet…");
    try {
      const { wallet, networkId, walletName } = await connectToWallet();
      const addresses = await wallet.getShieldedAddresses();
      setWalletAddress(addresses.shieldedAddress ?? null);
      setWalletNetworkId(networkId);
      setWalletConnectorName(typeof walletName === "string" && walletName ? walletName : null);

      const doctorHex = shieldedCoinPublicKeyToDoctorKeyHex(
        addresses.shieldedCoinPublicKey,
        networkId as NetworkId
      );
      setWalletDoctorKeyHex(doctorHex);

      setFlowMessage(null);
      setStatus("idle");
    } catch (e) {
      setFlowMessage(null);
      setWalletAddress(null);
      setWalletDoctorKeyHex(null);
      setWalletNetworkId(null);
      setWalletConnectorName(null);
      throw e;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, walletAddress, connectToWallet]);

  const initProviders = useCallback(async () => {
    const { wallet, config, networkId: walletReportedNetworkId, walletName } = await connectToWallet();
    const addresses = await wallet.getShieldedAddresses();
    if (!addresses.shieldedCoinPublicKey || !addresses.shieldedEncryptionPublicKey) {
      throw new Error("Wallet did not provide shieldedCoinPublicKey or shieldedEncryptionPublicKey");
    }
    if (!config.proverServerUri) {
      throw new Error(
        "Proof server URI not available from wallet configuration. Set the proof server in your wallet for this network or update the extension."
      );
    }

    const zkConfigProvider = new FetchZkConfigProvider(zkConfigPath, fetch.bind(window));
    const proofProvider = httpClientProofProvider(config.proverServerUri, zkConfigProvider);
    const publicDataProvider = indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);

    const walletProvider: WalletProvider = {
      getCoinPublicKey(): ledger.CoinPublicKey {
        return addresses.shieldedCoinPublicKey as ledger.CoinPublicKey;
      },
      getEncryptionPublicKey(): ledger.EncPublicKey {
        return addresses.shieldedEncryptionPublicKey as ledger.EncPublicKey;
      },
      async balanceTx(tx: UnboundTransaction): Promise<ledger.FinalizedTransaction> {
        try {
          setFlowMessage("Signing with your wallet…");
          const serialized = tx.serialize();
          const hex = uint8ArrayToHex(serialized);
          const result = await (
            wallet as unknown as {
              balanceUnsealedTransaction: (h: string, o: object) => Promise<{ tx: string }>;
            }
          ).balanceUnsealedTransaction(hex, {});
          return ledger.Transaction.deserialize(
            "signature",
            "proof",
            "binding",
            hexToUint8Array(result.tx)
          ) as ledger.FinalizedTransaction;
        } catch (e) {
          throw e;
        } finally {
          setFlowMessage(null);
        }
      }
    };

    const midnightProvider: MidnightProvider = {
      async submitTx(tx: ledger.FinalizedTransaction) {
        try {
          setFlowMessage("Submitting...");
          const hex = uint8ArrayToHex(tx.serialize());
          await wallet.submitTransaction(hex);
          return tx.identifiers()[0];
        } finally {
          setFlowMessage(null);
        }
      }
    };

    const providers = {
      publicDataProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
      zkConfigProvider,
      privateStateProvider: browserPrivateStateProvider,
      loggerProvider: noopLoggerProvider
    };
    providersRef.current = providers;
    return {
      providers,
      walletSnapshot: {
        addresses,
        networkId: walletReportedNetworkId,
        walletName
      }
    };
  }, [connectToWallet, zkConfigPath, browserPrivateStateProvider]);

  const compiledContract = useMemo(() => {
    return CompiledContract.withCompiledFileAssets(withVacant, zkConfigPath);
  }, [zkConfigPath]);

  const refreshState = useCallback(async (): Promise<boolean> => {
    if (!contractAddressRef.current || !providersRef.current) return false;
    try {
      const stateData = await providersRef.current.publicDataProvider.queryContractState(
        contractAddressRef.current as never
      );
      if (!stateData) {
        setState(null);
        setStateRefreshError(null);
        return true;
      }
      const ledgerState = ZKClinic.ledger(stateData.data);
      const pending: ZKClinicState["pending"] = [];
      for (const [doctor, hash] of ledgerState.pendingIssuers) {
        pending.push({
          doctor: Buffer.from(doctor.bytes).toString("hex").toLowerCase(),
          hash: Buffer.from(hash).toString("hex").toLowerCase()
        });
      }
      const issuers: ZKClinicState["issuers"] = [];
      for (const [doctor, rec] of ledgerState.issuers) {
        issuers.push({
          doctor: Buffer.from(doctor.bytes).toString("hex").toLowerCase(),
          hash: Buffer.from(rec.licenseHash).toString("hex"),
          attestationHash: Buffer.from(rec.attestationHash).toString("hex"),
          issuerVerificationHash: Buffer.from(rec.issuerVerificationHash).toString("hex"),
          status: Number(rec.status)
        });
      }
      const revokedCredentialIds: string[] = [];
      for (const id of ledgerState.revokedCredentials) {
        revokedCredentialIds.push(Buffer.from(id).toString("hex").toLowerCase());
      }
      const trials: TrialLedgerEntry[] = [];
      for (const [trialId, tr] of ledgerState.trials) {
        trials.push({
          trialId: Buffer.from(trialId).toString("hex").toLowerCase(),
          manager: Buffer.from(tr.manager.bytes).toString("hex").toLowerCase(),
          slotsTotal: tr.slotsTotal,
          slotsFilled: tr.slotsFilled,
          deadline: tr.deadline,
          status: Number(tr.status),
          criteriaHash: Buffer.from(tr.criteriaHash).toString("hex").toLowerCase(),
          eligibilityThresholdBps: tr.eligibilityThresholdBps
        });
      }
      setState({
        admin: Buffer.from(ledgerState.admin.bytes).toString("hex").toLowerCase(),
        pending,
        issuers,
        revokedCredentialIds,
        trials
      });
      setStateRefreshError(null);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStateRefreshError(msg);
      console.error("[ZKClinic] refreshState failed:", e);
      return false;
    }
  }, [contractAddressRef, providersRef]);

  const join = useCallback(
    async (address: string) => {
      try {
        setStatus("in-progress");
        setError(null);
        setStateRefreshError(null);
        const normalized = normalizeContractAddressHex(address);
        assertIsContractAddress(normalized as ContractAddress);
        const { providers, walletSnapshot } = await initProviders();
        setWalletAddress(walletSnapshot.addresses.shieldedAddress ?? null);
        setWalletNetworkId(walletSnapshot.networkId);
        setWalletConnectorName(
          typeof walletSnapshot.walletName === "string" && walletSnapshot.walletName
            ? walletSnapshot.walletName
            : null
        );
        setWalletDoctorKeyHex(
          shieldedCoinPublicKeyToDoctorKeyHex(
            walletSnapshot.addresses.shieldedCoinPublicKey,
            walletSnapshot.networkId as NetworkId
          )
        );
        setFlowMessage("Joining contract...");
        const joined = await findDeployedContract(providers as never, {
          contractAddress: normalized as never,
          compiledContract
        } as never);
        const addr = joined?.deployTxData?.public?.contractAddress ?? normalized;
        contractAddressRef.current = addr as ContractAddress;
        setContractAddress(typeof addr === "string" ? addr : uint8ArrayToHex(addr as unknown as Uint8Array));
        setFlowMessage(null);
        setStatus("deployed");
        await refreshState();
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("failed");
        setFlowMessage(null);
      }
    },
    [initProviders, compiledContract, refreshState]
  );

  const submitRequest = useCallback(
    async (licenseHashHex: string) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const hash = hexToUint8Array(licenseHashHex.replace(/^0x/, "").toLowerCase());
      if (hash.length !== 32) throw new Error("License hash must be 32 bytes (64 hex chars)");
      setFlowMessage("Submitting request...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "submitIssuerRequest" as never,
        args: [hash] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const zeroBytes32 = (): Uint8Array => new Uint8Array(32);

  const approveIssuer = useCallback(
    async (
      doctorPubKeyHex: string,
      opts?: {
        nmcVerification?: {
          doctorId: string;
          regdNoValue: string;
          ocrNameHint?: string;
          ocrSmcHint?: string;
        };
      }
    ) => {
      if (!providersRef.current || !contractAddressRef.current || !state) throw new Error("No contract or state");
      const key = normalizeDoctorKey(doctorPubKeyHex);
      const pendingEntry = state.pending.find((p) => p.doctor === key);
      if (!pendingEntry) throw new Error(`No pending request for doctor ${key}`);
      setFlowMessage("Calling attestation API...");
      const body: Record<string, unknown> = {
        doctorPubKeyHex: key,
        licenseHash: pendingEntry.hash
      };
      if (opts?.nmcVerification) {
        body.verification = opts.nmcVerification;
      }
      const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/attest-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const rawJson = (await res.json()) as Record<string, unknown>;
      if (res.status === 202 && rawJson.pendingReview) {
        throw new Error(
          `Manual review required (reviewId: ${String(rawJson.reviewId ?? "")}). ` +
            "Use finalizeIssuerReview after admin approves in the verification API."
        );
      }
      if (res.status === 409) {
        const j = rawJson as { error?: string; registrationId?: string };
        throw new Error(
          j.error ??
            `Issuer registration still verifying (id: ${String(j.registrationId ?? "")}). Retry shortly.`
        );
      }
      if (!res.ok) {
        const err = rawJson.error ? String(rawJson.error) : `HTTP ${res.status}`;
        throw new Error(`Attestation failed: ${err}`);
      }
      const data = rawJson as {
        verified?: boolean;
        attestationHash?: string;
        issuerVerificationHash?: string;
      };
      if (!data.verified) throw new Error("Attestation rejected");
      const attestationHashHex = data.attestationHash ?? "";
      if (!attestationHashHex) throw new Error("No attestation hash returned");
      const attestationHash = hexToUint8Array(attestationHashHex.replace(/^0x/, ""));
      let issuerVerificationBytes = zeroBytes32();
      const ivHex = (data.issuerVerificationHash ?? "").replace(/^0x/, "").toLowerCase();
      if (/^[0-9a-f]{64}$/.test(ivHex)) {
        issuerVerificationBytes = hexToUint8Array(ivHex);
      }
      const doctorBytes = hexToUint8Array(key);
      const doctorKey = { bytes: doctorBytes };
      setFlowMessage("Approving on-chain...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "approveIssuer" as never,
        args: [doctorKey, attestationHash, issuerVerificationBytes] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, state, compiledContract, refreshState]
  );

  const finalizeIssuerReview = useCallback(
    async (reviewId: string, doctorPubKeyHex: string) => {
      if (!providersRef.current || !contractAddressRef.current || !state) throw new Error("No contract or state");
      const adminToken = import.meta.env.VITE_ZKCLINIC_ADMIN_TOKEN as string | undefined;
      if (!adminToken?.trim()) {
        throw new Error(
          "Set VITE_ZKCLINIC_ADMIN_TOKEN to match ZKCLINIC_ADMIN_TOKEN on the verification API to finalize reviews."
        );
      }
      const doctorKeyHex = normalizeDoctorKey(doctorPubKeyHex);
      const pendingEntry = state.pending.find((p) => p.doctor === doctorKeyHex);
      if (!pendingEntry) throw new Error(`No pending request for doctor ${doctorKeyHex}`);

      const res = await fetch(
        `${VERIFICATION_API_URL.replace(/\/$/, "")}/doctor-verification/reviews/${encodeURIComponent(reviewId)}/approve`,
        {
          method: "POST",
          headers: { "X-ZKCLINIC-ADMIN-TOKEN": adminToken.trim() }
        }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Review approve failed: ${res.status} ${t}`);
      }
      const data = (await res.json()) as {
        attestationHash?: string;
        issuerVerificationHash?: string;
        doctorPubKeyHex?: string;
      };
      const attestationHashHex = data.attestationHash ?? "";
      if (!attestationHashHex) throw new Error("No attestation hash returned");
      const attestationHash = hexToUint8Array(attestationHashHex.replace(/^0x/, ""));
      let issuerVerificationBytes = zeroBytes32();
      const ivHex = (data.issuerVerificationHash ?? "").replace(/^0x/, "").toLowerCase();
      if (/^[0-9a-f]{64}$/.test(ivHex)) {
        issuerVerificationBytes = hexToUint8Array(ivHex);
      }
      const doctorBytes = hexToUint8Array(normalizeDoctorKey(data.doctorPubKeyHex ?? doctorKeyHex));
      const doctorKey = { bytes: doctorBytes };
      setFlowMessage("Approving on-chain after review…");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "approveIssuer" as never,
        args: [doctorKey, attestationHash, issuerVerificationBytes] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, state, compiledContract, refreshState]
  );

  const revokeIssuer = useCallback(
    async (doctorPubKeyHex: string) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const key = normalizeDoctorKey(doctorPubKeyHex);
      const doctorBytes = hexToUint8Array(key);
      setFlowMessage("Revoking...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "revokeIssuer" as never,
        args: [{ bytes: doctorBytes }] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const registerCredential = useCallback(
    async (credentialIdHex: string) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const id = hexToUint8Array(credentialIdHex.replace(/^0x/, "").toLowerCase());
      if (id.length !== 32) throw new Error("Credential ID must be 32 bytes (64 hex chars)");
      setFlowMessage("Registering credential...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "registerCredential" as never,
        args: [id] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const appendDiagnosisToCredential = useCallback(
    async (credentialIdHex: string, entryCommitmentHex: string) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const id = hexToUint8Array(credentialIdHex.replace(/^0x/, "").toLowerCase());
      if (id.length !== 32) throw new Error("Credential ID must be 32 bytes (64 hex chars)");
      const commitment = hexToUint8Array(entryCommitmentHex.replace(/^0x/, "").toLowerCase());
      if (commitment.length !== 32) throw new Error("Diagnosis commitment must be 32 bytes (64 hex chars)");
      setFlowMessage("Recording diagnosis on-chain…");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "appendDiagnosisToCredential" as never,
        args: [id, commitment] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const revokeCredential = useCallback(
    async (credentialIdHex: string) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const id = hexToUint8Array(credentialIdHex.replace(/^0x/, "").toLowerCase());
      if (id.length !== 32) throw new Error("Credential ID must be 32 bytes (64 hex chars)");
      setFlowMessage("Revoking credential...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "revokeCredential" as never,
        args: [id] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const createCredentialRequest = useCallback(
    async (
      patientId?: string,
      patientIntake?: PatientIntakeV1,
      continuingCredentialIdHex?: string
    ): Promise<{ requestCode: string }> => {
      const cont = continuingCredentialIdHex?.trim().replace(/^0x/i, "").toLowerCase();
      const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/credential-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientId || undefined,
          patientIntake: patientIntake ?? undefined,
          continuingCredentialId: cont && /^[0-9a-f]{64}$/.test(cont) ? cont : undefined
        })
      });
      if (!res.ok) throw new Error(`Failed to create request: ${await res.text()}`);
      const data = (await res.json()) as { requestCode: string };
      return { requestCode: data.requestCode };
    },
    []
  );

  const fetchCredentialRequest = useCallback(
    async (code: string) => {
      const res = await fetch(
        `${VERIFICATION_API_URL.replace(/\/$/, "")}/credential-requests/${code.toUpperCase()}`
      );
      if (!res.ok) throw new Error("Request not found");
      const data = (await res.json()) as {
        requestId: string;
        hasCredential: boolean;
        patientIntake?: PatientIntakeV1;
        hasPatientIntake?: boolean;
        continuingCredentialId?: string;
        hasContinuingCredentialId?: boolean;
      };
      return data;
    },
    []
  );

  const deliverCredential = useCallback(
    async (requestCode: string, encryptedCredential: string, credentialIdHex: string) => {
      const code = requestCode.toUpperCase();
      const res = await fetch(
        `${VERIFICATION_API_URL.replace(/\/$/, "")}/credential-requests/${code}/credential`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            encryptedCredential,
            credentialId: credentialIdHex.replace(/^0x/, "").toLowerCase()
          })
        }
      );
      if (!res.ok) throw new Error(`Failed to deliver: ${await res.text()}`);
    },
    []
  );

  const fetchAndStoreCredential = useCallback(
    async (code: string) => {
      const res = await fetch(
        `${VERIFICATION_API_URL.replace(/\/$/, "")}/credential-requests/${code.toUpperCase()}/credential`
      );
      if (!res.ok) throw new Error("Credential not yet delivered");
      const data = (await res.json()) as {
        encryptedCredential: string;
        credentialId: string;
      };
      upsertStoredCredential({
        requestCode: code.toUpperCase(),
        credentialId: data.credentialId.replace(/^0x/i, "").toLowerCase(),
        encryptedCredential: data.encryptedCredential,
        fetchedAt: Date.now()
      });
    },
    []
  );

  const createTrial = useCallback(
    async (
      trialIdHex: string,
      slotsTotal: bigint,
      deadlineMs: bigint,
      criteriaHashHex: string,
      eligibilityThresholdBps: bigint = 7500n
    ) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const id = hexToUint8Array(trialIdHex.replace(/^0x/, "").toLowerCase());
      if (id.length !== 32) throw new Error("Trial id must be 32 bytes (64 hex chars)");
      const h = hexToUint8Array(criteriaHashHex.replace(/^0x/, "").toLowerCase());
      if (h.length !== 32) throw new Error("Criteria hash must be 32 bytes");
      if (eligibilityThresholdBps <= 0n || eligibilityThresholdBps > 10000n) {
        throw new Error("eligibilityThresholdBps must be 1–10000 (basis points, 7500 = 75%)");
      }
      setFlowMessage("Creating trial on-chain...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "createTrial" as never,
        args: [id, slotsTotal, deadlineMs, h, eligibilityThresholdBps] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const closeTrial = useCallback(
    async (trialIdHex: string) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const id = hexToUint8Array(trialIdHex.replace(/^0x/, "").toLowerCase());
      if (id.length !== 32) throw new Error("Trial id must be 64 hex chars");
      setFlowMessage("Closing trial...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "closeTrial" as never,
        args: [id] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const recordEnrollment = useCallback(
    async (trialIdHex: string) => {
      if (!providersRef.current || !contractAddressRef.current) throw new Error("No contract");
      const id = hexToUint8Array(trialIdHex.replace(/^0x/, "").toLowerCase());
      if (id.length !== 32) throw new Error("Trial id must be 64 hex chars");
      setFlowMessage("Recording enrollment...");
      await submitCallTx(providersRef.current as never, {
        compiledContract,
        contractAddress: contractAddressRef.current,
        circuitId: "recordEnrollment" as never,
        args: [id] as never
      } as never);
      setFlowMessage(null);
      await refreshState();
    },
    [providersRef, contractAddressRef, compiledContract, refreshState]
  );

  const value: ZKClinicContextValue = useMemo(
    () => ({
      expectedNetworkId: NETWORK_ID,
      walletNetworkId,
      isConnecting,
      status,
      contractAddress,
      error,
      stateRefreshError,
      state,
      walletAddress,
      walletConnectorName,
      walletDoctorKeyHex,
      flowMessage,
      connect,
      join,
      refreshState,
      submitRequest,
      approveIssuer,
      finalizeIssuerReview,
      revokeIssuer,
      registerCredential,
      appendDiagnosisToCredential,
      revokeCredential,
      createCredentialRequest,
      fetchCredentialRequest,
      deliverCredential,
      fetchAndStoreCredential,
      createTrial,
      closeTrial,
      recordEnrollment
    }),
    [
      walletNetworkId,
      isConnecting,
      status,
      contractAddress,
      error,
      stateRefreshError,
      state,
      walletAddress,
      walletConnectorName,
      walletDoctorKeyHex,
      flowMessage,
      connect,
      join,
      refreshState,
      submitRequest,
      approveIssuer,
      finalizeIssuerReview,
      revokeIssuer,
      registerCredential,
      appendDiagnosisToCredential,
      revokeCredential,
      createCredentialRequest,
      fetchCredentialRequest,
      deliverCredential,
      fetchAndStoreCredential,
      createTrial,
      closeTrial,
      recordEnrollment
    ]
  );

  return (
    <ZKClinicContext.Provider value={value}>
      {children}
    </ZKClinicContext.Provider>
  );
}
