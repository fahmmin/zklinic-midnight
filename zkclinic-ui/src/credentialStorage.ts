/**
 * Milestone 2: Store credentials on patient device only (localStorage).
 */

const STORAGE_KEY = "zkclinic-credentials";

export interface StoredCredentialMeta {
  requestCode: string;
  credentialId: string;
  encryptedCredential: string;
  fetchedAt: number;
}

export function getStoredCredentials(): StoredCredentialMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addStoredCredential(meta: StoredCredentialMeta): void {
  const list = getStoredCredentials();
  if (list.some((c) => c.credentialId === meta.credentialId)) return;
  list.push(meta);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Same logical card (`credentialId`): replace ciphertext + latest fetch code (continuing-care updates). */
export function upsertStoredCredential(meta: StoredCredentialMeta): void {
  const list = getStoredCredentials().filter((c) => c.credentialId !== meta.credentialId);
  list.push(meta);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function replaceStoredCredentials(list: StoredCredentialMeta[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function removeStoredCredential(credentialId: string): void {
  const list = getStoredCredentials().filter((c) => c.credentialId !== credentialId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
