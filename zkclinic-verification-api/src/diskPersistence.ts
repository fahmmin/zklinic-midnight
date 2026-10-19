import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type PersistedEnvelopeV1 = {
  v: 1;
  credentialRequests: [string, unknown][];
  trialsStore: [string, unknown][];
  proofsStore: [string, unknown][];
  doctorReviewQueue?: [string, unknown][];
  /** Issuer registration workflow (doctor IMR + cert + NMC background check). */
  issuerRegistrations?: [string, unknown][];
};

export function defaultPersistencePath(): string {
  return process.env.ZKCLINIC_PERSISTENCE_PATH ?? `${process.cwd()}/data/zkclinic-api-store.json`;
}

export function loadPersistedJson(path: string): PersistedEnvelopeV1 | null {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as PersistedEnvelopeV1;
    if (parsed?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePersistedJson(path: string, data: PersistedEnvelopeV1): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data), "utf8");
  renameSync(tmp, path);
}

export function createDebouncedPersist(flushMs: number): (fn: () => void) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (fn: () => void) => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, flushMs);
  };
}
