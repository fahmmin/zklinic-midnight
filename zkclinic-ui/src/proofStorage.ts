import type { EligibilityCriterionResult } from "./trialProof";

const STORAGE_KEY = "zkclinic-proofs";

export interface StoredProofMeta {
  proofId: string;
  trialId: string;
  trialTitle: string;
  credentialId: string;
  pseudonym: string;
  eligible: boolean;
  matchPercent?: number;
  thresholdPercent?: number;
  createdAt: number;
  expiresAt: number;
  criterionResults: EligibilityCriterionResult[];
  revealedIdentity?: string;
}

export function getStoredProofs(): StoredProofMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredProofMeta[]) : [];
  } catch {
    return [];
  }
}

export function replaceStoredProofs(list: StoredProofMeta[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertStoredProof(meta: StoredProofMeta): void {
  const list = getStoredProofs();
  const existingIndex = list.findIndex((proof) => proof.proofId === meta.proofId);
  if (existingIndex >= 0) {
    list[existingIndex] = meta;
  } else {
    list.unshift(meta);
  }
  replaceStoredProofs(list);
}
