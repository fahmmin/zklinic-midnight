/**
 * Headless deploy: builds a wallet from WALLET_MNEMONIC, deploys the ZKClinic registry and prints its address.
 *
 *   NETWORK=preprod|preview  WALLET_MNEMONIC="..."  [BLOCKFROST_PROJECT_ID=...]  npm run deploy -w zkclinic-cli
 *
 * Secrets come from the environment only — never commit them.
 */
import { closeWallet, buildWalletAndWaitForFunds, configureProviders, deploy, toContractAddressHex } from "./api.js";
import { PreprodConfig, PreviewConfig, type Config } from "./config.js";

const network = (process.env.NETWORK ?? "preprod").toLowerCase();
const mnemonic = process.env.WALLET_MNEMONIC?.trim();
if (!mnemonic) throw new Error("Set WALLET_MNEMONIC in the environment.");

const config: Config =
  network === "preview" ? new PreviewConfig() : network === "preprod" ? new PreprodConfig() : (() => {
    throw new Error(`Unsupported NETWORK "${network}" (use preview or preprod).`);
  })();

/** Strip Blockfrost tokens from anything we print. */
const redact = (text: string): string => text.replace(/project_id=[^&\s"')]+/g, "project_id=***");

process.on("unhandledRejection", (r) => {
  console.error(redact(r instanceof Error ? `${r.message}\n${r.stack ?? ""}` : String(r)));
  process.exit(1);
});

console.log(`Deploying ZKClinic to ${config.networkId} (proof server ${config.proofServer})`);
const walletContext = await buildWalletAndWaitForFunds(config, mnemonic);
try {
  const providers = await configureProviders(walletContext, config);
  const contract = await deploy(providers, config);
  const address = toContractAddressHex(contract.deployTxData.public.contractAddress);
  console.log(`\nDEPLOYED_CONTRACT_ADDRESS=${address}`);
} finally {
  await closeWallet(walletContext);
}
process.exit(0);
