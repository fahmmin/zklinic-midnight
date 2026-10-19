/**
 * Connects to an already-running local Midnight network (e.g. midnight-local-network).
 * No docker containers are started here — the network must be running at:
 *   Node:         http://127.0.0.1:9944
 *   Indexer:      http://127.0.0.1:8088
 *   Proof Server: http://127.0.0.1:6300
 */
import { runCli } from "./cli.js";
import { StandaloneConfig } from "./config.js";

const config = new StandaloneConfig();
await runCli(config);
