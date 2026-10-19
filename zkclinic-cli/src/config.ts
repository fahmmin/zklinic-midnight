import path from "node:path";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

export const currentDir = path.resolve(new URL(import.meta.url).pathname, "..");

export const contractConfig = {
  privateStateStoreName: "zkclinic-private-state",
  zkConfigPath: path.resolve(currentDir, "..", "..", "contract", "src", "managed", "zkclinic")
};

export interface Config {
  readonly logDir?: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly networkId: string;
}

/** Connects to an already-running local Midnight network (e.g. midnight-local-network). */
export class StandaloneConfig implements Config {
  logDir = path.resolve(currentDir, "..", "logs", "standalone", `${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
  indexer = "http://127.0.0.1:8088/api/v3/graphql";
  indexerWS = "ws://127.0.0.1:8088/api/v3/graphql/ws";
  node = "http://127.0.0.1:9944";
  proofServer = "http://127.0.0.1:6300";
  networkId = "undeployed";

  constructor() {
    setNetworkId(this.networkId);
  }
}

export class PreviewConfig implements Config {
  indexer = "https://indexer.preview.midnight.network/api/v3/graphql";
  indexerWS = "wss://indexer.preview.midnight.network/api/v3/graphql/ws";
  node = "wss://rpc.preview.midnight.network";
  proofServer = process.env.PROOF_SERVER_URL ?? "http://127.0.0.1:6300";
  networkId = "preview";

  constructor() {
    setNetworkId(this.networkId);
  }
}

/**
 * Midnight public pre-production testnet.
 * Preprod indexers expect API **v4** (wallet sync hangs on v3). Node URL uses HTTPS so
 * `api.ts` derives `wss://…` for the relay (same pattern as community / 1AM templates).
 */
export class PreprodConfig implements Config {
  indexer = "https://indexer.preprod.midnight.network/api/v4/graphql";
  indexerWS = "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";
  node = "https://rpc.preprod.midnight.network";
  proofServer = process.env.PROOF_SERVER_URL ?? "http://127.0.0.1:6300";
  networkId = "preprod";

  constructor() {
    setNetworkId(this.networkId);
  }
}

