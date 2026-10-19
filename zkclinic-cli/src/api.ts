import "dotenv/config";
import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import * as Rx from "rxjs";
import { wordlist as english } from "@scure/bip39/wordlists/english.js";
import * as bip39 from "@scure/bip39";
import * as ledger from "@midnight-ntwrk/ledger-v7";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { HDWallet, Roles } from "@midnight-ntwrk/wallet-sdk-hd";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey as UnshieldedPublicKey,
  type UnshieldedKeystore,
  UnshieldedWallet
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import type { MidnightProvider, UnboundTransaction, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { assertIsContractAddress } from "@midnight-ntwrk/midnight-js-utils";
import { WebSocket } from "ws";
import { ZKClinic } from "zkclinic-contract";
import { type Config, contractConfig } from "./config.js";
import { type DeployedZKClinicContract, type ZKClinicCircuits, type ZKClinicProviders } from "./common-types.js";

// Needed by indexer graphql subscriptions.
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

/**
 * Doctor coin public key (64 hex chars). WASM exposes `coinPublicKey` as a hex string, not `{ bytes }`.
 */
export const getDoctorCoinPublicKeyHex = (walletContext: WalletContext): string => {
  const pk = walletContext.shieldedSecretKeys.coinPublicKey as unknown;
  if (typeof pk === "string") {
    return padHex32(pk.replace(/^0x/, "")).toLowerCase();
  }
  if (pk && typeof pk === "object" && "bytes" in (pk as object)) {
    const b = (pk as { bytes: Uint8Array }).bytes;
    if (b instanceof Uint8Array) {
      return Buffer.from(b).toString("hex").toLowerCase();
    }
  }
  throw new Error("Cannot read shielded coin public key from wallet");
};

const baseContract = CompiledContract.make<ZKClinic.Contract<undefined>>("ZKClinic", ZKClinic.Contract);
const withVacant = CompiledContract.withVacantWitnesses(baseContract);
export const zkClinicCompiledContract = CompiledContract.withCompiledFileAssets(
  withVacant,
  contractConfig.zkConfigPath
);

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  webcrypto.getRandomValues(bytes);
  return bytes;
};

const padHex32 = (hex: string): string => {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error("Expected hex input");
  }
  if (raw.length > 64) {
    throw new Error("Hex input too long for 32 bytes");
  }
  return raw.padStart(64, "0");
};

export const parseBytes32Hex = (hex: string): Uint8Array => Buffer.from(padHex32(hex), "hex");

export const parseCoinPublicKeyHex = (hex: string): { bytes: Uint8Array } => ({ bytes: parseBytes32Hex(hex) });

/** Normalize contract address to 64-char hex string. */
export const toContractAddressHex = (addr: unknown): string => {
  if (typeof addr === "string") return padHex32(addr.replace(/^0x/, ""));
  if (addr && typeof addr === "object" && "bytes" in addr && addr.bytes instanceof Uint8Array) {
    return Buffer.from(addr.bytes).toString("hex");
  }
  throw new Error("Invalid contract address");
};

const createWalletAndMidnightProvider = async (
  walletContext: WalletContext
): Promise<WalletProvider & MidnightProvider> => {
  await Rx.firstValueFrom(walletContext.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey(): ledger.CoinPublicKey {
      return walletContext.shieldedSecretKeys.coinPublicKey;
    },
    getEncryptionPublicKey(): ledger.EncPublicKey {
      return walletContext.shieldedSecretKeys.encryptionPublicKey;
    },
    async balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<ledger.FinalizedTransaction> {
      const txTtl = ttl ?? new Date(Date.now() + 30 * 60 * 1000);
      const recipe = await walletContext.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletContext.shieldedSecretKeys, dustSecretKey: walletContext.dustSecretKey },
        { ttl: txTtl }
      );
      return walletContext.wallet.finalizeRecipe(recipe);
    },
    async submitTx(tx: ledger.FinalizedTransaction): Promise<ledger.TransactionId> {
      return walletContext.wallet.submitTransaction(tx);
    }
  };
};

export const displayWalletBalances = async (wallet: WalletFacade): Promise<void> => {
  const state = await Rx.firstValueFrom(wallet.state());
  const unshielded = state.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
  const shielded = state.shielded?.balances[ledger.nativeToken().raw] ?? 0n;
  const total = unshielded + shielded;
  console.log(`Unshielded balance: ${unshielded} tDUST`);
  console.log(`Shielded balance: ${shielded} tDUST`);
  console.log(`Total balance: ${total} tDUST`);
};

const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

const parseTimeoutMs = (value: string | undefined, fallbackMs: number): number => {
  const n = Number(value ?? "");
  return Number.isFinite(n) && n > 0 ? n : fallbackMs;
};

const WALLET_SYNC_TIMEOUT_MS = parseTimeoutMs(process.env.WALLET_SYNC_TIMEOUT_MS, 6 * 60_000);
const FUNDS_TIMEOUT_MS = parseTimeoutMs(process.env.WALLET_FUNDS_TIMEOUT_MS, 10 * 60_000);
const DEPLOY_TIMEOUT_MS = parseTimeoutMs(process.env.DEPLOY_TIMEOUT_MS, 8 * 60_000);
const JOIN_TIMEOUT_MS = parseTimeoutMs(process.env.JOIN_TIMEOUT_MS, 3 * 60_000);
const PREFLIGHT_TIMEOUT_MS = parseTimeoutMs(process.env.PREFLIGHT_TIMEOUT_MS, 8_000);

const withTimeout = async <T>(label: string, ms: number, promise: Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const isHttpOk = async (url: string, timeoutMs: number): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    return res.ok || res.status === 400 || res.status === 404 || res.status === 405;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

type SyncProgressLike = {
  appliedIndex: bigint;
  highestRelevantWalletIndex: bigint;
  highestIndex: bigint;
  isConnected: boolean;
};

/** Compact per-wallet sync status, e.g. `shielded 120/5000 (connected)`. Defensive: SDK state shapes vary. */
const describeSyncProgress = (state: unknown): string => {
  const parts: string[] = [];
  for (const key of ["shielded", "unshielded", "dust"] as const) {
    const progress = (state as Record<string, { progress?: SyncProgressLike } | undefined>)[key]?.progress;
    if (!progress) continue;
    parts.push(
      `${key} ${progress.appliedIndex}/${progress.highestRelevantWalletIndex} (head ${progress.highestIndex}, ${
        progress.isConnected ? "connected" : "DISCONNECTED"
      })`
    );
  }
  return parts.join(" | ");
};

const waitForSync = (wallet: WalletFacade) =>
  withTimeout(
    "Wallet sync",
    WALLET_SYNC_TIMEOUT_MS,
    Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(5_000),
        Rx.tap((state) => log(`Waiting for wallet sync. Synced: ${state.isSynced} ${describeSyncProgress(state)}`)),
        Rx.filter((state) => state.isSynced)
      )
    )
  );

const waitForFunds = (wallet: WalletFacade) =>
  withTimeout(
    "Wallet funding",
    FUNDS_TIMEOUT_MS,
    Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(10_000),
        Rx.tap((state) => {
          const unshielded = state.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
          const shielded = state.shielded?.balances[ledger.nativeToken().raw] ?? 0n;
          log(`Waiting for funds. Synced: ${state.isSynced}, Unshielded: ${unshielded}, Shielded: ${shielded}`);
        }),
        Rx.filter((state) => state.isSynced),
        Rx.map(
          (s) =>
            (s.unshielded?.balances[ledger.nativeToken().raw] ?? 0n) +
            (s.shielded?.balances[ledger.nativeToken().raw] ?? 0n)
        ),
        Rx.filter((balance) => balance > 0n)
      )
    )
  );

const registerNightForDust = async (walletContext: WalletContext): Promise<void> => {
  const state = await Rx.firstValueFrom(walletContext.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const unregisteredNightUtxos =
    state.unshielded?.availableCoins.filter((coin) => coin.meta.registeredForDustGeneration === false) ?? [];
  if (unregisteredNightUtxos.length === 0) {
    const dustBalance = state.dust?.walletBalance(new Date()) ?? 0n;
    if (dustBalance > 0n) {
      log("All Night UTXOs already registered for dust.");
      return;
    }
    log("No unshielded Night UTXOs available for dust registration.");
    return;
  }
  log(`Found ${unregisteredNightUtxos.length} unshielded Night UTXOs. Registering for dust...`);
  const recipe = await walletContext.wallet.registerNightUtxosForDustGeneration(
    unregisteredNightUtxos,
    walletContext.unshieldedKeystore.getPublicKey(),
    (payload) => walletContext.unshieldedKeystore.signData(payload)
  );
  const finalizedTx = await walletContext.wallet.finalizeRecipe(recipe);
  const txId = await walletContext.wallet.submitTransaction(finalizedTx);
  log(`Dust registration submitted. Tx: ${txId}`);
  log("Waiting for dust to be generated...");
  await Rx.firstValueFrom(
    walletContext.wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap((s) => log(`Dust balance: ${s.dust?.walletBalance(new Date()) ?? 0n}`)),
      Rx.filter((s) => (s.dust?.walletBalance(new Date()) ?? 0n) > 0n)
    )
  );
  log("Dust registration complete!");
};

const initWalletWithSeed = async (seed: Buffer, config: Config): Promise<WalletContext> => {
  const hdWallet = HDWallet.fromSeed(seed);
  if (hdWallet.type !== "seedOk") throw new Error("Failed to initialize wallet seed");
  const derived = hdWallet.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  if (derived.type !== "keysDerived") throw new Error("Failed to derive keys");
  hdWallet.hdWallet.clear();

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(derived.keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(derived.keys[Roles.NightExternal], config.networkId as never);
  const relayURL = new URL(config.node.replace(/^http/, "ws"));

  const shieldedWallet = ShieldedWallet({
    networkId: config.networkId,
    indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
    provingServerUrl: new URL(config.proofServer),
    relayURL
  }).startWithSecretKeys(shieldedSecretKeys);

  const unshieldedCfg: Record<string, unknown> = {
    networkId: config.networkId,
    indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
    txHistoryStorage: new InMemoryTransactionHistoryStorage()
  };
  const unshieldedWallet = UnshieldedWallet(unshieldedCfg as never).startWithPublicKey(
    UnshieldedPublicKey.fromKeyStore(unshieldedKeystore)
  );

  const dustConfig: Record<string, unknown> = {
    networkId: config.networkId,
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
    indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
    provingServerUrl: new URL(config.proofServer),
    relayURL
  };
  const dustWallet = DustWallet(dustConfig as never).startWithSecretKey(
    dustSecretKey,
    ledger.LedgerParameters.initialParameters().dust
  );

  const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
};

/** Build wallet from mnemonic and wait for sync + funds + dust registration (like example-zkloan). */
export const buildWalletAndWaitForFunds = async (config: Config, mnemonic: string): Promise<WalletContext> => {
  if (!bip39.validateMnemonic(mnemonic.trim(), english)) throw new Error("Invalid mnemonic");
  log("Building wallet from mnemonic...");
  const seed = Buffer.from(await bip39.mnemonicToSeed(mnemonic.trim()));
  const walletContext = await initWalletWithSeed(seed, config);
  log(`Wallet address: ${walletContext.unshieldedKeystore.getBech32Address().asString()}`);
  log("Waiting for wallet to sync...");
  await waitForSync(walletContext.wallet);
  const state = await Rx.firstValueFrom(walletContext.wallet.state());
  const unshielded = state.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
  const shielded = state.shielded?.balances[ledger.nativeToken().raw] ?? 0n;
  const total = unshielded + shielded;
  log(`Unshielded: ${unshielded} tDUST, Shielded: ${shielded} tDUST, Total: ${total} tDUST`);
  if (total === 0n) {
    log("Waiting to receive tokens...");
    await waitForFunds(walletContext.wallet);
  }
  await registerNightForDust(walletContext);
  return walletContext;
};

export const buildFreshWallet = async (config: Config): Promise<{ walletContext: WalletContext; mnemonic: string }> => {
  const mnemonic = bip39.generateMnemonic(english, 256);
  log(`Generated new wallet mnemonic: ${mnemonic}`);
  const walletContext = await buildWalletAndWaitForFunds(config, mnemonic);
  return { walletContext, mnemonic };
};

export const buildWalletFromMnemonic = async (config: Config, mnemonic: string): Promise<WalletContext> =>
  buildWalletAndWaitForFunds(config, mnemonic);

/** Genesis wallet for standalone/undeployed network - holds minted NIGHT from genesis block. */
const GENESIS_MINT_WALLET_SEED = "0000000000000000000000000000000000000000000000000000000000000001";

export const buildWalletFromHexSeed = async (config: Config, hexSeed: string): Promise<WalletContext> => {
  log("Building wallet from hex seed...");
  const seed = Buffer.from(hexSeed, "hex");
  const walletContext = await initWalletWithSeed(seed, config);
  log(`Wallet address: ${walletContext.unshieldedKeystore.getBech32Address().asString()}`);
  log("Waiting for wallet to sync...");
  await waitForSync(walletContext.wallet);
  const state = await Rx.firstValueFrom(walletContext.wallet.state());
  const unshielded = state.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
  const shielded = state.shielded?.balances[ledger.nativeToken().raw] ?? 0n;
  log(`Unshielded: ${unshielded} tDUST, Shielded: ${shielded} tDUST, Total: ${unshielded + shielded} tDUST`);
  await registerNightForDust(walletContext);
  return walletContext;
};

export { GENESIS_MINT_WALLET_SEED };

export const faucetHint = (walletContext: WalletContext): string =>
  walletContext.unshieldedKeystore.getBech32Address().asString();

export const configureProviders = async (walletContext: WalletContext, config: Config): Promise<ZKClinicProviders> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(walletContext);
  const storagePassword = process.env.MIDNIGHT_STORAGE_PASSWORD ?? "zkclinic-default-password";
  const zkConfigProvider = new NodeZkConfigProvider<ZKClinicCircuits>(contractConfig.zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: contractConfig.privateStateStoreName,
      privateStoragePasswordProvider: () => storagePassword
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider
  };
};

export const deploy = async (providers: ZKClinicProviders, config: Config): Promise<DeployedZKClinicContract> => {
  const proofHealthUrl = (() => {
    try {
      const u = new URL(config.proofServer);
      u.pathname = "/health";
      u.search = "";
      return u.toString();
    } catch {
      return `${config.proofServer.replace(/\/$/, "")}/health`;
    }
  })();
  log("Preflight: checking proof server and indexer reachability...");
  const [proofOk, indexerOk] = await Promise.all([
    isHttpOk(proofHealthUrl, PREFLIGHT_TIMEOUT_MS),
    isHttpOk(config.indexer, PREFLIGHT_TIMEOUT_MS)
  ]);
  if (!proofOk) {
    throw new Error(
      `Proof server is unreachable at ${proofHealthUrl}. Start/verify your proof server before deploy.`
    );
  }
  if (!indexerOk) {
    log(`Warning: indexer check failed at ${config.indexer}. Deploy/join may stall until indexer connectivity is restored.`);
  }
  log("Deploying contract (proof generation + submit can take a few minutes)...");
  const startedAt = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract = await withTimeout(
    "Contract deployment",
    DEPLOY_TIMEOUT_MS,
    deployContract(providers as any, { compiledContract: zkClinicCompiledContract } as any)
  );
  log(`Deploy completed in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
  return contract as never;
};

export const join = async (providers: ZKClinicProviders, contractAddress: string): Promise<DeployedZKClinicContract> => {
  assertIsContractAddress(contractAddress);
  log("Joining deployed contract...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract = await withTimeout(
    "Join deployed contract",
    JOIN_TIMEOUT_MS,
    findDeployedContract(providers as any, {
      compiledContract: zkClinicCompiledContract,
      contractAddress
    } as any)
  );
  return contract as never;
};

export const submitIssuerRequest = async (contract: DeployedZKClinicContract, licenseHashHex: string): Promise<void> => {
  await contract.callTx.submitIssuerRequest(parseBytes32Hex(licenseHashHex));
};

/** Approve is only available via approveIssuerWithAttestation (attestation required). */
export const approveIssuer = async (
  _contract: DeployedZKClinicContract,
  _doctorPubKeyHex: string
): Promise<void> => {
  throw new Error("Approval requires attestation. Use approveIssuerWithAttestation with verification API running.");
};

/** Get pending license hash for a doctor from on-chain state. */
export const getPendingLicenseHash = async (
  providers: ZKClinicProviders,
  contractAddress: string
): Promise<Map<string, string>> => {
  const state = await providers.publicDataProvider.queryContractState(contractAddress as never);
  if (!state) return new Map();
  const ledgerState = ZKClinic.ledger(state.data);
  const map = new Map<string, string>();
  for (const [doctor, hash] of ledgerState.pendingIssuers) {
    const key = Buffer.from(doctor.bytes).toString("hex").toLowerCase();
    map.set(key, Buffer.from(hash).toString("hex").toLowerCase());
  }
  return map;
};

/** Normalize doctor pub key for lookup (handles 0x, spaces, copy-pasted "doctor=... hash=..."). */
const normalizeDoctorKey = (input: string): string => {
  const trimmed = input.trim().replace(/^0x/i, "");
  const match = trimmed.match(/doctor=([0-9a-fA-F]{64})/);
  return (match ? match[1] : trimmed).toLowerCase();
};

/** Verify doctor via attestation API, then approve on-chain. */
export const approveIssuerWithAttestation = async (
  contract: DeployedZKClinicContract,
  providers: ZKClinicProviders,
  contractAddress: string,
  doctorPubKeyHex: string,
  verificationApiUrl: string
): Promise<{ attestationHash: string }> => {
  const pending = await getPendingLicenseHash(providers, contractAddress);
  const normalizedKey = normalizeDoctorKey(doctorPubKeyHex);
  const licenseHash = pending.get(normalizedKey);
  if (!licenseHash) throw new Error(`No pending issuer request found for doctor ${doctorPubKeyHex}`);
  const res = await fetch(`${verificationApiUrl.replace(/\/$/, "")}/attest-doctor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doctorPubKeyHex, licenseHash })
  });
  if (!res.ok) throw new Error(`Attestation failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { verified?: boolean; attestationHash?: string };
  if (!data.verified) throw new Error("Attestation rejected");
  const attestationHashBytes = parseBytes32Hex(data.attestationHash ?? "");
  const issuerVerificationHex = (data as { issuerVerificationHash?: string }).issuerVerificationHash?.replace(
    /^0x/,
    ""
  );
  const issuerVerificationBytes =
    issuerVerificationHex && /^[0-9a-fA-F]{64}$/.test(issuerVerificationHex)
      ? parseBytes32Hex(issuerVerificationHex)
      : new Uint8Array(32);
  await contract.callTx.approveIssuer(
    parseCoinPublicKeyHex(normalizedKey),
    attestationHashBytes,
    issuerVerificationBytes
  );
  return { attestationHash: data.attestationHash ?? "" };
};

export const revokeIssuer = async (contract: DeployedZKClinicContract, doctorPubKeyHex: string): Promise<void> => {
  await contract.callTx.revokeIssuer(parseCoinPublicKeyHex(normalizeDoctorKey(doctorPubKeyHex)));
};

/** Milestone 2: Register credential (doctor, when issuing). */
export const registerCredential = async (
  contract: DeployedZKClinicContract,
  credentialIdHex: string
): Promise<void> => {
  const id = parseBytes32Hex(credentialIdHex.replace(/^0x/, "").toLowerCase());
  await contract.callTx.registerCredential(id);
};

/** Append a diagnosis visit commitment to an existing card (same issuing doctor). */
export const appendDiagnosisToCredential = async (
  contract: DeployedZKClinicContract,
  credentialIdHex: string,
  entryCommitmentHex: string
): Promise<void> => {
  const id = parseBytes32Hex(credentialIdHex.replace(/^0x/, "").toLowerCase());
  const commitment = parseBytes32Hex(entryCommitmentHex.replace(/^0x/, "").toLowerCase());
  await contract.callTx.appendDiagnosisToCredential(id, commitment);
};

/** Contract admin transfers admin role to another coin public key (32-byte hex). */
export const transferAdminOnChain = async (
  contract: DeployedZKClinicContract,
  newAdminDoctorPubKeyHex: string
): Promise<void> => {
  await contract.callTx.transferAdmin(parseCoinPublicKeyHex(normalizeDoctorKey(newAdminDoctorPubKeyHex)));
};

/** Milestone 2: Revoke credential (doctor, for incorrectly issued). */
export const revokeCredential = async (
  contract: DeployedZKClinicContract,
  credentialIdHex: string
): Promise<void> => {
  const id = parseBytes32Hex(credentialIdHex.replace(/^0x/, "").toLowerCase());
  await contract.callTx.revokeCredential(id);
};

/** Milestone 3: Create trial (caller is manager). */
export const createTrialOnChain = async (
  contract: DeployedZKClinicContract,
  trialIdHex: string,
  slotsTotal: bigint,
  deadlineMs: bigint,
  criteriaHashHex: string,
  eligibilityThresholdBps: bigint = 7500n
): Promise<void> => {
  const id = parseBytes32Hex(trialIdHex.replace(/^0x/, "").toLowerCase());
  const h = parseBytes32Hex(criteriaHashHex.replace(/^0x/, "").toLowerCase());
  if (eligibilityThresholdBps <= 0n || eligibilityThresholdBps > 10000n) {
    throw new Error("eligibilityThresholdBps must be 1–10000 (basis points)");
  }
  await contract.callTx.createTrial(id, slotsTotal, deadlineMs, h, eligibilityThresholdBps);
};

export const closeTrialOnChain = async (
  contract: DeployedZKClinicContract,
  trialIdHex: string
): Promise<void> => {
  const id = parseBytes32Hex(trialIdHex.replace(/^0x/, "").toLowerCase());
  await contract.callTx.closeTrial(id);
};

export const recordEnrollmentOnChain = async (
  contract: DeployedZKClinicContract,
  trialIdHex: string
): Promise<void> => {
  const id = parseBytes32Hex(trialIdHex.replace(/^0x/, "").toLowerCase());
  await contract.callTx.recordEnrollment(id);
};

const bytesToHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex").toLowerCase();

const ISSUER_STATUS_LABELS = ["None", "Pending", "Approved", "Revoked"] as const;
const TRIAL_STATUS_LABELS = ["Open", "Closed", "Full"] as const;

function issuerStatusLabel(n: bigint | number): string {
  const i = Number(n);
  return ISSUER_STATUS_LABELS[i] ?? `Unknown(${i})`;
}

function trialStatusLabel(n: bigint | number): string {
  const i = Number(n);
  return TRIAL_STATUS_LABELS[i] ?? `Unknown(${i})`;
}

const parseListCap = (): number => {
  const raw = process.env.ZKCLINIC_CLI_STATE_LIST_CAP?.trim();
  const n = raw ? Number(raw) : 25;
  if (!Number.isFinite(n) || n < 1) return 25;
  return Math.min(500, Math.floor(n));
};

const isFullStateDump = (): boolean =>
  process.env.ZKCLINIC_CLI_STATE_FULL === "1" || process.env.ZKCLINIC_CLI_STATE_FULL === "true";

/**
 * Pretty-print indexer contract state (read-only). Cap long lists with ZKCLINIC_CLI_STATE_LIST_CAP (default 25);
 * set ZKCLINIC_CLI_STATE_FULL=1 to print every diagnosis slot row (can be very large).
 */
export const displayContractState = async (providers: ZKClinicProviders, contractAddress: string): Promise<void> => {
  const addr = contractAddress.replace(/^0x/i, "").toLowerCase();
  const state = await providers.publicDataProvider.queryContractState(contractAddress as never);
  if (!state) {
    console.log(`No indexer state for contract ${addr} (wrong address, or indexer has not indexed this deployment yet).`);
    return;
  }

  const ledgerState = ZKClinic.ledger(state.data);
  const cap = parseListCap();
  const full = isFullStateDump();

  const pendingN = Number(ledgerState.pendingIssuers.size());
  const issuersN = Number(ledgerState.issuers.size());
  const issuedN = Number(ledgerState.issuedCredentials.size());
  const revokedN = Number(ledgerState.revokedCredentials.size());
  const diagIdxN = Number(ledgerState.credentialDiagnosisNextIndex.size());
  const diagSlotN = Number(ledgerState.diagnosisCommitmentBySlot.size());
  const trialsN = Number(ledgerState.trials.size());

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  ZKClinic on-chain snapshot  ·  ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`Contract   ${addr}`);
  console.log(`Admin key  ${bytesToHex(ledgerState.admin.bytes)}`);
  console.log("");
  console.log("── Summary ──");
  console.log(
    `  Pending issuer requests: ${pendingN}  ·  Issuer records: ${issuersN}  ·  Issued credentials: ${issuedN}  ·  Revoked: ${revokedN}`
  );
  console.log(
    `  Trials: ${trialsN}  ·  Cards w/ diagnosis index: ${diagIdxN}  ·  Diagnosis commitment rows: ${diagSlotN}`
  );
  if (!full && (issuedN > cap || diagIdxN > cap || diagSlotN > cap)) {
    console.log(
      `  (List cap ${cap} per section — set ZKCLINIC_CLI_STATE_FULL=1 for full diagnosis dump, or ZKCLINIC_CLI_STATE_LIST_CAP=N)`
    );
  }
  console.log("");

  if (pendingN > 0) {
    console.log("── Pending issuer requests ──");
    let i = 0;
    for (const [doctor, hash] of ledgerState.pendingIssuers) {
      if (!full && i >= cap) {
        console.log(`  … ${pendingN - cap} more`);
        break;
      }
      console.log(`  ${bytesToHex(doctor.bytes)}  license ${bytesToHex(hash)}`);
      i++;
    }
    console.log("");
  }

  if (issuersN > 0) {
    console.log("── Issuers ──");
    let i = 0;
    for (const [doctor, rec] of ledgerState.issuers) {
      if (!full && i >= cap) {
        console.log(`  … ${issuersN - cap} more`);
        break;
      }
      const st = issuerStatusLabel(rec.status);
      console.log(
        `  [${st}] doctor ${bytesToHex(doctor.bytes)}  license ${bytesToHex(rec.licenseHash)}  attestation ${bytesToHex(rec.attestationHash)}`
      );
      i++;
    }
    console.log("");
  }

  if (issuedN > 0) {
    console.log("── Issued credentials (id → issuing doctor) ──");
    let i = 0;
    for (const [credId, issuer] of ledgerState.issuedCredentials) {
      if (!full && i >= cap) {
        console.log(`  … ${issuedN - cap} more`);
        break;
      }
      console.log(`  ${bytesToHex(credId)}  ←  ${bytesToHex(issuer.bytes)}`);
      i++;
    }
    console.log("");
  }

  if (revokedN > 0) {
    console.log("── Revoked credential ids ──");
    let i = 0;
    for (const id of ledgerState.revokedCredentials) {
      if (!full && i >= cap) {
        console.log(`  … ${revokedN - cap} more`);
        break;
      }
      console.log(`  ${bytesToHex(id)}`);
      i++;
    }
    console.log("");
  }

  if (diagIdxN > 0) {
    console.log("── Diagnosis: next slot index per card ──");
    let i = 0;
    for (const [credId, idx] of ledgerState.credentialDiagnosisNextIndex) {
      if (!full && i >= cap) {
        console.log(`  … ${diagIdxN - cap} more`);
        break;
      }
      console.log(`  card ${bytesToHex(credId)}  nextSlot=${idx.toString()}`);
      i++;
    }
    console.log("");
  }

  if (diagSlotN > 0) {
    console.log("── Diagnosis: commitment by composite slot key ──");
    let i = 0;
    for (const [slotKey, h] of ledgerState.diagnosisCommitmentBySlot) {
      if (!full && i >= cap) {
        console.log(`  … ${diagSlotN - cap} more (set ZKCLINIC_CLI_STATE_FULL=1 for all rows)`);
        break;
      }
      console.log(`  ${bytesToHex(slotKey)}  →  ${bytesToHex(h)}`);
      i++;
    }
    console.log("");
  }

  if (trialsN > 0) {
    console.log("── Trials ──");
    let i = 0;
    for (const [tid, tr] of ledgerState.trials) {
      if (!full && i >= cap) {
        console.log(`  … ${trialsN - cap} more`);
        break;
      }
      const st = trialStatusLabel(tr.status);
      const minMatch = (Number(tr.eligibilityThresholdBps) / 100).toFixed(1);
      console.log(
        `  [${st}] ${bytesToHex(tid)}  mgr ${bytesToHex(tr.manager.bytes)}  slots ${tr.slotsFilled.toString()}/${tr.slotsTotal.toString()}  min match ≥${minMatch}%  deadline(ms)=${tr.deadline.toString()}`
      );
      console.log(`         criteria ${bytesToHex(tr.criteriaHash)}`);
      i++;
    }
    console.log("");
  }

  console.log("── End of snapshot ──");
  console.log("");
};

export const closeWallet = async (walletContext: WalletContext): Promise<void> => {
  await walletContext.wallet.stop();
};

export const generateLicenseHash = (): string => Buffer.from(randomBytes(32)).toString("hex");

export const ensureFunds = async (walletContext: WalletContext): Promise<void> => {
  const current = await Rx.firstValueFrom(walletContext.wallet.state());
  const total = (current.unshielded?.balances[ledger.nativeToken().raw] ?? 0n) + (current.shielded?.balances[ledger.nativeToken().raw] ?? 0n);
  if (total > 0n) return;
  await waitForFunds(walletContext.wallet);
};

