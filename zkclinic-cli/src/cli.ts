import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { type Interface } from "node:readline/promises";
import "dotenv/config";
import {
  buildFreshWallet,
  buildWalletFromMnemonic,
  buildWalletFromHexSeed,
  GENESIS_MINT_WALLET_SEED,
  closeWallet,
  configureProviders,
  deploy,
  ensureFunds,
  faucetHint,
  generateLicenseHash,
  join,
  submitIssuerRequest,
  approveIssuerWithAttestation,
  revokeIssuer,
  registerCredential,
  appendDiagnosisToCredential,
  revokeCredential,
  createTrialOnChain,
  closeTrialOnChain,
  recordEnrollmentOnChain,
  transferAdminOnChain,
  getDoctorCoinPublicKeyHex,
  getPendingLicenseHash,
  toContractAddressHex,
  displayContractState
} from "./api.js";
import {
  createCredentialPayload,
  createCredentialPayloadContinuingCard,
  encryptCredential,
  diagnosisVisitCommitmentSync,
  randomVisitNonceHex
} from "./credential-node.js";
import {
  printDemoCopyPasteSheet,
  DEMO_LICENSE_HASH,
  DEMO_CREDENTIAL_ID,
  DEMO_ICD10_LINE,
  DEMO_PATIENT_LABEL,
  DEMO_TRIAL_ID,
  DEMO_CRITERIA_HASH,
  DEMO_DOCTOR_FULL_NAME,
  DEMO_DOCTOR_ID,
  DEMO_REGISTRATION_NO,
  DEMO_MEDICAL_COUNCIL,
  DEMO_IMR_RECORD_TEXT
} from "./demo-values.js";
import { type Config, PreviewConfig, StandaloneConfig } from "./config.js";
import { type DeployedZKClinicContract, type ZKClinicProviders } from "./common-types.js";

const ROLE_MNEMONIC_ENV: Record<string, string> = {
  doctor: "WALLET_MNEMONIC_DOCTOR",
  admin: "WALLET_MNEMONIC_ADMIN",
  trial: "WALLET_MNEMONIC_TRIAL",
  patient: "WALLET_MNEMONIC_PATIENT"
};

const isPublicMidnightTestnet = (config: Config): boolean =>
  config.networkId === "preview" || config.networkId === "preprod";

const publicFaucetUrl = (config: Config): string | null =>
  isPublicMidnightTestnet(config) ? `https://faucet.${config.networkId}.midnight.network` : null;

const buildWalletQuestion = (config: Config): string => {
  const fundLabel = isPublicMidnightTestnet(config) ? config.networkId : "the network";
  return `
Wallet (fund each role’s address on ${fundLabel}; patient can share any funded wallet for API-only steps):
  1. Generate a new wallet
  2. Import wallet from mnemonic
  3. Use mnemonic from .env (WALLET_MNEMONIC)
  4. Use role mnemonic from .env (doctor / admin / trial / patient → WALLET_MNEMONIC_*)
  5. Exit
Selection: `;
};

const CONTRACT_QUESTION = `
Contract:
  1. Deploy a new contract
  2. Join existing contract by address (Enter = ZKCLINIC_CONTRACT_ADDRESS or demo sheet address)
  3. Exit
Selection: `;

const ROLE_QUESTION = `
══ Role / workflow (pick what you are doing; all prompts accept Enter for demo defaults) ══
  1. Doctor — issuer request, API registration, credentials, fulfill patient request
  2. Patient — credential request via Verification API (no chain tx)
  3. Admin — approve / revoke issuer, transfer admin
  4. Trial manager — create / enroll / close trial
  5. Utilities — random hash, demo sheet, switch contract
  0. Exit
Selection: `;

const DOCTOR_MENU = `
── Doctor ──
  1. Submit issuer request (license hash; Enter = demo)
  2. Unified registration (API + on-chain submit; Enter = demo doctor fields)
  3. Fulfill patient request (request code; Enter = last code from this session + demo ICD-10)
  4. Register credential on-chain only (Enter = demo credential id)
  5. Revoke credential on-chain (Enter = demo credential id)
  0. Back
Selection: `;

const PATIENT_MENU = `
── Patient (Verification API) ──
  1. Create credential request (prints request code; Enter = demo patient label)
  2. Show last request code from this session
  0. Back
Selection: `;

const ADMIN_MENU = `
── Admin (contract admin wallet) ──
  1. Approve pending issuer (Enter = suggested pending doctor key)
  2. Revoke issuer (Enter = last doctor approved in this CLI session)
  3. Transfer admin (Enter = CLI_DEFAULT_NEXT_ADMIN_HEX when set)
  0. Back
Selection: `;

const TRIAL_MENU = `
── Trial manager ──
  1. Create trial (Enter = demo trial id, slots, deadline, criteria)
  2. Record enrollment (Enter = last trial id from session)
  3. Close trial (Enter = last trial id)
  0. Back
Selection: `;

const UTIL_MENU = `
── Utilities ──
  1. Show random 32-byte license hash
  2. Print demo copy-paste sheet
  3. Switch contract (join another address)
  4. View on-chain state (indexer snapshot for this contract)
  0. Back
Selection: `;

type CliSession = {
  lastRequestCode: string;
  lastTrialId: string;
  lastDoctorPubKeyHex: string;
};

const defaultVerificationApiUrl = () => process.env.VERIFICATION_API_URL ?? "http://localhost:4100";

const promptWithDefault = async (rli: Interface, label: string, defaultValue: string): Promise<string> => {
  const hint = defaultValue ? ` [default: ${defaultValue}]` : "";
  const raw = (await rli.question(`${label}${hint}: `)).trim();
  return raw || defaultValue;
};

const pickWallet = async (rli: Interface, config: Config) => {
  if (config instanceof StandaloneConfig) {
    const walletContext = await buildWalletFromHexSeed(config, GENESIS_MINT_WALLET_SEED);
    return { walletContext, config };
  }
  while (true) {
    const choice = (await rli.question(buildWalletQuestion(config))).trim();
    switch (choice) {
      case "1": {
        const { walletContext, mnemonic } = await buildFreshWallet(config);
        console.log(`Generated mnemonic:\n${mnemonic}\n`);
        console.log(`Wallet address: ${faucetHint(walletContext)}`);
        const faucet = publicFaucetUrl(config);
        console.log(
          faucet
            ? `Fund this address from the ${config.networkId} faucet if needed: ${faucet}`
            : "Fund this address if needed."
        );
        await ensureFunds(walletContext);
        return { walletContext, config };
      }
      case "2": {
        const mnemonic = (await rli.question("Enter mnemonic: ")).trim();
        const walletContext = await buildWalletFromMnemonic(config, mnemonic);
        console.log(`Wallet address: ${faucetHint(walletContext)}`);
        await ensureFunds(walletContext);
        return { walletContext, config };
      }
      case "3": {
        const envMnemonic = process.env.WALLET_MNEMONIC;
        if (!envMnemonic) {
          console.log("No WALLET_MNEMONIC found in .env file");
          break;
        }
        console.log("Using mnemonic from .env file...");
        const walletContext = await buildWalletFromMnemonic(config, envMnemonic);
        console.log(`Wallet address: ${faucetHint(walletContext)}`);
        await ensureFunds(walletContext);
        return { walletContext, config };
      }
      case "4": {
        const role = (await rli.question("Role name (doctor | admin | trial | patient): "))
          .trim()
          .toLowerCase();
        const envName = ROLE_MNEMONIC_ENV[role];
        if (!envName) {
          console.log("Unknown role. Use: doctor, admin, trial, patient");
          break;
        }
        const roleMnemonic = process.env[envName];
        if (!roleMnemonic) {
          console.log(`No ${envName} in environment`);
          break;
        }
        console.log(`Using ${envName}…`);
        const walletContext = await buildWalletFromMnemonic(config, roleMnemonic);
        console.log(`Wallet address: ${faucetHint(walletContext)}`);
        await ensureFunds(walletContext);
        return { walletContext, config };
      }
      case "5":
        return null;
      default:
        console.log("Invalid selection");
    }
  }
};

const pickContract = async (
  rli: Interface,
  providers: Awaited<ReturnType<typeof configureProviders>>,
  config: Config
) => {
  while (true) {
    const choice = (await rli.question(CONTRACT_QUESTION)).trim();
    switch (choice) {
      case "1": {
        const contract = await deploy(providers, config);
        const contractAddress = toContractAddressHex(contract.deployTxData.public.contractAddress);
        console.log(`Deployed contract at: ${contractAddress}`);
        return { contract, contractAddress };
      }
      case "2": {
        const envAddr = process.env.ZKCLINIC_CONTRACT_ADDRESS?.replace(/^0x/i, "").trim() ?? "";
        const defaultAddr = envAddr.length === 64 && /^[0-9a-fA-F]+$/.test(envAddr) ? envAddr.toLowerCase() : "";
        const contractAddress = (
          await promptWithDefault(rli, "Contract address (64 hex)", defaultAddr)
        ).replace(/^0x/i, "");
        if (contractAddress.length !== 64 || !/^[0-9a-f]+$/.test(contractAddress)) {
          console.log("Invalid contract address.");
          break;
        }
        const contract = await join(providers, contractAddress);
        console.log(`Joined contract at: ${contractAddress}`);
        return { contract, contractAddress };
      }
      case "3":
        return null;
      default:
        console.log("Invalid selection");
    }
  }
};

const hex64 = (s: string): string => s.replace(/^0x/i, "").toLowerCase();

const isHex64 = (s: string): boolean => /^[0-9a-f]{64}$/.test(s);

const normalizeDoctorKeyInput = (input: string): string => {
  const trimmed = input.trim().replace(/^0x/i, "");
  const match = trimmed.match(/doctor=([0-9a-fA-F]{64})/);
  return (match ? match[1] : trimmed).toLowerCase();
};

async function pickPendingDoctorKey(
  rli: Interface,
  providers: ZKClinicProviders,
  contractAddress: string,
  session: CliSession,
  label: string
): Promise<string | null> {
  const pending = await getPendingLicenseHash(providers, contractAddress);
  if (pending.size === 0) {
    console.log("No pending issuer requests on-chain.");
    return null;
  }
  const keys = [...pending.keys()].sort();
  const suggested =
    (session.lastDoctorPubKeyHex && pending.has(session.lastDoctorPubKeyHex)
      ? session.lastDoctorPubKeyHex
      : keys[0]) ?? "";
  const raw = await promptWithDefault(rli, label, suggested);
  const k = normalizeDoctorKeyInput(raw);
  if (!isHex64(k)) {
    console.log("Doctor public key must be 64 hex characters.");
    return null;
  }
  if (!pending.has(k)) {
    console.log("That key has no pending issuer request.");
    return null;
  }
  return k;
}

async function runDoctorMenu(
  rli: Interface,
  contract: DeployedZKClinicContract,
  activeWallet: NonNullable<Awaited<ReturnType<typeof pickWallet>>>,
  session: CliSession
): Promise<void> {
  const choice = (await rli.question(DOCTOR_MENU)).trim();
  const verificationApiUrl = defaultVerificationApiUrl();

  switch (choice) {
    case "1": {
      const raw = await promptWithDefault(rli, "License hash hex (Enter = demo)", DEMO_LICENSE_HASH);
      const h = hex64(raw);
      const useHash = isHex64(h) ? h : DEMO_LICENSE_HASH;
      if (!isHex64(h)) {
        console.log("Invalid length/hex — using demo license hash.");
      }
      await submitIssuerRequest(contract, useHash);
      console.log(`Submitted issuer request with licenseHash=${useHash}`);
      break;
    }
    case "2": {
      const doctorHex = getDoctorCoinPublicKeyHex(activeWallet.walletContext);
      console.log(`\nDoctor public key (this wallet): ${doctorHex}`);
      const regName = await promptWithDefault(rli, "Full name", DEMO_DOCTOR_FULL_NAME);
      const regDoctorId = await promptWithDefault(rli, "Doctor ID / IMR number", DEMO_DOCTOR_ID);
      const regRegNo = await promptWithDefault(rli, "Registration number", DEMO_REGISTRATION_NO);
      const regCouncil = await promptWithDefault(rli, "Council / State Medical Council", DEMO_MEDICAL_COUNCIL);
      const regImr = await promptWithDefault(rli, "IMR / register excerpt (Enter = demo)", DEMO_IMR_RECORD_TEXT);
      if (!regImr.trim() || regImr.trim().length < 8) {
        console.log("IMR excerpt must be at least 8 characters (matches verification API mock path).");
        break;
      }
      const certAns = (await promptWithDefault(rli, "Certificate PDF to attach? (y/n, y required for auto-verify)", "y")).toLowerCase();
      const hasCert = certAns === "y" || certAns === "yes";
      if (!hasCert) {
        console.log("PDF receipt is required for the single registration path (mock auto-verify).");
        break;
      }
      const body: Record<string, string> = {
        doctorPubKeyHex: doctorHex,
        doctorId: regDoctorId,
        regdNoValue: regRegNo,
        imrRecordText: regImr.trim(),
        certificateOcrText: "[PDF uploaded: mock-certificate.pdf]"
      };
      if (regName) body.ocrNameHint = regName;
      if (regCouncil) body.ocrSmcHint = regCouncil;
      const regRes = await fetch(`${verificationApiUrl.replace(/\/$/, "")}/issuer-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!regRes.ok) {
        console.log(`Registration API failed: ${regRes.status} ${await regRes.text()}`);
        break;
      }
      const regData = (await regRes.json()) as {
        licenseHash?: string;
        status?: string;
        registrationId?: string;
      };
      const lic = (regData.licenseHash ?? "").replace(/^0x/, "").toLowerCase();
      if (!isHex64(lic)) {
        console.log("API returned an invalid licenseHash. Aborting on-chain submit.");
        break;
      }
      const statusLabels: Record<string, string> = {
        pending_verification: "Pending NMC verification (background check running)",
        api_verified: "Auto-verified via NMC — awaiting admin on-chain approval",
        pending_admin: "NMC inconclusive — pending manual admin review",
        rejected: "Rejected by NMC check",
        admin_approved: "Already approved"
      };
      console.log(`API status: ${statusLabels[regData.status ?? ""] ?? regData.status ?? "unknown"}`);
      console.log(`Registration ID: ${(regData.registrationId ?? "").slice(0, 24)}…`);
      console.log(`License hash:    ${lic}`);
      console.log("\nSubmitting issuer request on-chain…");
      await submitIssuerRequest(contract, lic);
      console.log("Issuer request submitted on-chain. Use Admin → approve.");
      break;
    }
    case "3": {
      const defaultCode = session.lastRequestCode;
      const code = (await promptWithDefault(rli, "Patient request code", defaultCode)).trim().toUpperCase();
      if (code.length < 4) {
        console.log("Run Patient → create request first (or paste a code).");
        break;
      }
      const lookup = await fetch(`${verificationApiUrl.replace(/\/$/, "")}/credential-requests/${code}`);
      if (!lookup.ok) {
        console.log(`Request not found or API error: ${lookup.status}`);
        break;
      }
      const reqInfo = (await lookup.json()) as {
        hasCredential?: boolean;
        continuingCredentialId?: string;
      };
      if (reqInfo.hasCredential) {
        console.log("Credential already delivered for this request.");
        break;
      }
      const icd10 = await promptWithDefault(rli, "ICD-10 codes (comma-separated)", DEMO_ICD10_LINE);
      const codes = icd10.split(",").map((s) => s.trim()).filter(Boolean);
      if (codes.length === 0) {
        console.log("Enter at least one ICD-10 code.");
        break;
      }
      const doctorHex = getDoctorCoinPublicKeyHex(activeWallet.walletContext);
      const contFromApi = reqInfo.continuingCredentialId?.replace(/^0x/i, "").toLowerCase();
      const isContinuing = !!contFromApi && isHex64(contFromApi);
      const payload = isContinuing
        ? createCredentialPayloadContinuingCard(contFromApi!, doctorHex, codes)
        : createCredentialPayload(doctorHex, codes);
      const commitment = diagnosisVisitCommitmentSync({
        credentialId: payload.credentialId,
        icd10Codes: payload.icd10Codes,
        issuedAtMs: payload.issuedAt,
        visitNonceHex: randomVisitNonceHex()
      });
      const encrypted = await encryptCredential(payload, code, { useCardKey: isContinuing });
      if (!isContinuing) {
        await registerCredential(contract, payload.credentialId);
      }
      await appendDiagnosisToCredential(contract, payload.credentialId, commitment);
      const deliver = await fetch(
        `${verificationApiUrl.replace(/\/$/, "")}/credential-requests/${code}/credential`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            encryptedCredential: encrypted,
            credentialId: payload.credentialId
          })
        }
      );
      if (!deliver.ok) {
        console.log(`Deliver to API failed: ${deliver.status} ${await deliver.text()}`);
        console.log("On-chain updates may have succeeded; retry delivery if needed.");
        break;
      }
      console.log(
        `\nCredential ${isContinuing ? "updated (continuing card)" : "registered"} on-chain; diagnosis commitment appended; delivered to API.`
      );
      console.log(`Credential ID: ${payload.credentialId}`);
      console.log("\n--- Encrypted credential (base64) — patient decrypts with request code ---");
      console.log(encrypted);
      console.log("------------------------------------------------------------------------\n");
      break;
    }
    case "4": {
      const credId = hex64(await promptWithDefault(rli, "Credential ID (64 hex)", DEMO_CREDENTIAL_ID));
      if (!isHex64(credId)) {
        console.log("Invalid credential ID. Must be 64 hex chars.");
        break;
      }
      await registerCredential(contract, credId);
      console.log("Credential registered on-chain.");
      break;
    }
    case "5": {
      const credId = hex64(await promptWithDefault(rli, "Credential ID (64 hex)", DEMO_CREDENTIAL_ID));
      if (!isHex64(credId)) {
        console.log("Invalid credential ID. Must be 64 hex chars.");
        break;
      }
      await revokeCredential(contract, credId);
      console.log("Credential revoked on-chain.");
      break;
    }
    case "0":
      break;
    default:
      console.log("Invalid selection");
  }
}

async function runPatientMenu(rli: Interface, session: CliSession): Promise<void> {
  const choice = (await rli.question(PATIENT_MENU)).trim();
  const verificationApiUrl = defaultVerificationApiUrl();

  switch (choice) {
    case "1": {
      const patientId = await promptWithDefault(rli, "Optional patient label", DEMO_PATIENT_LABEL);
      const continuingHex = hex64(
        await promptWithDefault(rli, "Continuing credential id 64 hex (empty for new card)", "")
      );
      const body: Record<string, unknown> = {};
      if (patientId) body.patientId = patientId;
      if (continuingHex && isHex64(continuingHex)) {
        body.continuingCredentialId = continuingHex;
      }
      const res = await fetch(`${verificationApiUrl.replace(/\/$/, "")}/credential-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        console.log(`Failed: ${res.status} ${await res.text()}`);
        break;
      }
      const data = (await res.json()) as { requestCode: string; requestId: string };
      session.lastRequestCode = data.requestCode;
      console.log("\n--- Copy this request code for your doctor ---");
      console.log(data.requestCode);
      console.log("---------------------------------------------\n");
      break;
    }
    case "2": {
      if (session.lastRequestCode) {
        console.log(`Last request code: ${session.lastRequestCode}`);
      } else {
        console.log("No request code in this session yet.");
      }
      break;
    }
    case "0":
      break;
    default:
      console.log("Invalid selection");
  }
}

async function runAdminMenu(
  rli: Interface,
  contract: DeployedZKClinicContract,
  providers: ZKClinicProviders,
  contractAddress: string,
  session: CliSession
): Promise<void> {
  const choice = (await rli.question(ADMIN_MENU)).trim();
  const verificationApiUrl = defaultVerificationApiUrl();

  switch (choice) {
    case "1": {
      const doctor = await pickPendingDoctorKey(
        rli,
        providers,
        contractAddress,
        session,
        "Doctor public key (32-byte hex, or doctor=... line)"
      );
      if (!doctor) break;
      try {
        const { attestationHash } = await approveIssuerWithAttestation(
          contract,
          providers,
          contractAddress,
          doctor,
          verificationApiUrl
        );
        session.lastDoctorPubKeyHex = doctor;
        console.log(`Issuer approved on-chain. Attestation hash: ${attestationHash || "(none)"}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const apiUnreachable =
          msg.includes("fetch") ||
          msg.includes("ECONNREFUSED") ||
          msg.includes("network") ||
          (e instanceof TypeError && msg.includes("fetch"));
        if (apiUnreachable) {
          console.error(
            `\nVerification API unreachable at ${verificationApiUrl}. ` +
              "Start: npm run dev -w zkclinic-verification-api\n"
          );
        }
        throw e;
      }
      break;
    }
    case "2": {
      const raw = await promptWithDefault(
        rli,
        "Doctor public key to revoke (64 hex; Enter = last approved in this session)",
        session.lastDoctorPubKeyHex
      );
      const doctor = normalizeDoctorKeyInput(raw);
      if (!isHex64(doctor)) {
        console.log("Invalid doctor key.");
        break;
      }
      await revokeIssuer(contract, doctor);
      console.log("Issuer revoked on-chain.");
      break;
    }
    case "3": {
      const envNext = process.env.CLI_DEFAULT_NEXT_ADMIN_HEX?.replace(/^0x/i, "").toLowerCase() ?? "";
      const nextAdmin = hex64(await promptWithDefault(rli, "New admin doctor public key (64 hex)", envNext));
      if (!isHex64(nextAdmin)) {
        console.log("Invalid key — need 64 hex chars (coin public key). Set CLI_DEFAULT_NEXT_ADMIN_HEX or paste key.");
        break;
      }
      await transferAdminOnChain(contract, nextAdmin);
      console.log("Contract admin transferred on-chain.");
      break;
    }
    case "0":
      break;
    default:
      console.log("Invalid selection");
  }
}

async function runTrialMenu(
  rli: Interface,
  contract: DeployedZKClinicContract,
  session: CliSession
): Promise<void> {
  const choice = (await rli.question(TRIAL_MENU)).trim();

  switch (choice) {
    case "1": {
      const idHex = hex64(await promptWithDefault(rli, "Trial id hex (64 hex)", DEMO_TRIAL_ID));
      if (!isHex64(idHex)) {
        console.log("Trial id must be exactly 64 hex characters.");
        break;
      }
      const slotsStr = await promptWithDefault(rli, "Slots total", "10");
      const slots = BigInt(slotsStr || "10");
      const deadlineStr = await promptWithDefault(
        rli,
        "Deadline unix ms",
        String(Date.now() + 86400000 * 365)
      );
      const deadlineMs = BigInt(deadlineStr);
      const crit = hex64(await promptWithDefault(rli, "Criteria hash hex (64 hex)", DEMO_CRITERIA_HASH));
      if (!isHex64(crit)) {
        console.log("Criteria hash must be 64 hex chars.");
        break;
      }
      const bpsStr = await promptWithDefault(rli, "Eligibility threshold basis points (7500 = 75%)", "7500");
      const eligibilityThresholdBps = BigInt(bpsStr || "7500");
      await createTrialOnChain(contract, idHex, slots, deadlineMs, crit, eligibilityThresholdBps);
      session.lastTrialId = idHex;
      console.log(`Trial created: id=${idHex}`);
      break;
    }
    case "2": {
      const tid = hex64(await promptWithDefault(rli, "Trial id (64 hex)", session.lastTrialId || DEMO_TRIAL_ID));
      if (!isHex64(tid)) {
        console.log("Invalid trial id.");
        break;
      }
      await recordEnrollmentOnChain(contract, tid);
      session.lastTrialId = tid;
      console.log("Enrollment recorded on-chain.");
      break;
    }
    case "3": {
      const tid = hex64(await promptWithDefault(rli, "Trial id (64 hex)", session.lastTrialId || DEMO_TRIAL_ID));
      if (!isHex64(tid)) {
        console.log("Invalid trial id.");
        break;
      }
      await closeTrialOnChain(contract, tid);
      session.lastTrialId = tid;
      console.log("Trial closed on-chain.");
      break;
    }
    case "0":
      break;
    default:
      console.log("Invalid selection");
  }
}

async function runUtilMenu(
  rli: Interface,
  providers: Awaited<ReturnType<typeof configureProviders>>,
  holders: { contract: DeployedZKClinicContract; contractAddress: string },
  activeWallet: NonNullable<Awaited<ReturnType<typeof pickWallet>>>
): Promise<void> {
  const choice = (await rli.question(UTIL_MENU)).trim();

  switch (choice) {
    case "1":
      console.log(generateLicenseHash());
      break;
    case "2": {
      printDemoCopyPasteSheet({
        doctorCoinPublicKeyHex: getDoctorCoinPublicKeyHex(activeWallet.walletContext),
        contractAddressHex: holders.contractAddress,
        verificationApiUrl: defaultVerificationApiUrl()
      });
      break;
    }
    case "3": {
      const envAddr = process.env.ZKCLINIC_CONTRACT_ADDRESS?.replace(/^0x/i, "").trim() ?? "";
      const defaultAddr = envAddr.length === 64 && /^[0-9a-fA-F]+$/.test(envAddr) ? envAddr.toLowerCase() : "";
      const addr = hex64(await promptWithDefault(rli, "Contract address (64 hex)", defaultAddr));
      if (!isHex64(addr)) {
        console.log("Invalid address.");
        break;
      }
      holders.contract = await join(providers, addr);
      holders.contractAddress = addr;
      console.log(`Switched contract to ${addr}`);
      break;
    }
    case "4": {
      const useCurrent = (
        await promptWithDefault(rli, "Query current joined contract? (y/n)", "y")
      )
        .trim()
        .toLowerCase();
      const isY = useCurrent === "y" || useCurrent === "yes" || useCurrent === "";
      let addr = holders.contractAddress;
      if (!isY) {
        const raw = await promptWithDefault(rli, "Contract address (64 hex)", holders.contractAddress);
        const h = hex64(raw);
        if (!isHex64(h)) {
          console.log("Invalid address — need 64 hex characters.");
          break;
        }
        addr = h;
      }
      try {
        await displayContractState(providers, addr);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`Failed to read contract state: ${msg}`);
      }
      break;
    }
    case "0":
      break;
    default:
      console.log("Invalid selection");
  }
}

export async function runCli(config: Config = new PreviewConfig()): Promise<void> {
  const rli = createInterface({ input, output, terminal: true });
  let activeWallet: Awaited<ReturnType<typeof pickWallet>> | null = null;

  const session: CliSession = {
    lastRequestCode: "",
    lastTrialId: "",
    lastDoctorPubKeyHex: ""
  };

  try {
    activeWallet = await pickWallet(rli, config);
    if (!activeWallet) return;
    const providers = await configureProviders(activeWallet.walletContext, activeWallet.config);
    const active = await pickContract(rli, providers, activeWallet.config);
    if (!active) return;

    const holders = { contract: active.contract, contractAddress: active.contractAddress };

    while (true) {
      const role = (await rli.question(ROLE_QUESTION)).trim();
      try {
        if (role === "0") return;
        if (role === "1") await runDoctorMenu(rli, holders.contract, activeWallet, session);
        else if (role === "2") await runPatientMenu(rli, session);
        else if (role === "3")
          await runAdminMenu(rli, holders.contract, providers, holders.contractAddress, session);
        else if (role === "4") await runTrialMenu(rli, holders.contract, session);
        else if (role === "5") await runUtilMenu(rli, providers, holders, activeWallet);
        else console.log("Invalid selection");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`Operation failed: ${message}`);
      }
    }
  } finally {
    rli.close();
    if (activeWallet) {
      await closeWallet(activeWallet.walletContext);
    }
  }
}
