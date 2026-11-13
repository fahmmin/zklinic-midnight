/**
 * The patient's ZK identity: a 32-byte secret that never leaves this device. Its public half is
 * what the doctor binds a credential commitment to; the secret is a private witness of
 * `proveEligibility`.
 */
import { ZKClinic } from "zkclinic-contract";

const STORAGE_KEY = "zkclinic-zk-secret";

export const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (s: string): Uint8Array =>
  Uint8Array.from(s.replace(/^0x/i, "").match(/../g) ?? [], (h) => parseInt(h, 16));

// shortcut: key lives only in localStorage, so clearing site data orphans attested cards; add it to the credential backup file when backup/restore gets a UI.
export function zkSecretKey(): Uint8Array {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && /^[0-9a-f]{64}$/.test(stored)) return fromHex(stored);
  const fresh = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(STORAGE_KEY, toHex(fresh));
  return fresh;
}

export const zkPublicKeyHex = (): string => toHex(ZKClinic.pureCircuits.patientPublicKey(zkSecretKey()));
