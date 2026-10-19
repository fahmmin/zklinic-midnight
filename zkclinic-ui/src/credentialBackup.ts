import type { StoredCredentialMeta } from "./credentialStorage";
import type { StoredProofMeta } from "./proofStorage";

export interface CredentialBackupV1 {
  version: 1;
  exportedAt: number;
  credentials: StoredCredentialMeta[];
  proofs: StoredProofMeta[];
}

export function exportCredentialBackup(
  credentials: StoredCredentialMeta[],
  proofs: StoredProofMeta[]
): string {
  const payload: CredentialBackupV1 = {
    version: 1,
    exportedAt: Date.now(),
    credentials,
    proofs
  };
  return JSON.stringify(payload, null, 2);
}

export function parseCredentialBackup(text: string): CredentialBackupV1 {
  const parsed = JSON.parse(text) as Partial<CredentialBackupV1>;
  if (parsed.version !== 1) {
    throw new Error("Unsupported backup version");
  }
  if (!Array.isArray(parsed.credentials)) {
    throw new Error("Backup is missing credentials");
  }
  if (!Array.isArray(parsed.proofs)) {
    throw new Error("Backup is missing proofs");
  }
  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === "number" ? parsed.exportedAt : Date.now(),
    credentials: parsed.credentials,
    proofs: parsed.proofs
  };
}
