/**
 * Milestone 2: Health credential schema and crypto utilities.
 * Credential is signed by doctor, encrypted for patient, stored on device only.
 */
export const CREDENTIAL_VALIDITY_MONTHS = 12;
export function createCredentialId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
function normalizeCredentialIdHex(id) {
    return id.replace(/^0x/i, "").toLowerCase();
}
function normMedToken(s) {
    return s.trim().toLowerCase();
}
function mergeMedicationsAndIntake(intake, doctorMeds) {
    const fromIntakeMeds = (intake?.medicationsList ?? []).map((m) => m.trim()).filter(Boolean);
    const docMeds = (doctorMeds ?? []).map((m) => m.trim()).filter(Boolean);
    const medByKey = new Map();
    for (const m of [...docMeds, ...fromIntakeMeds]) {
        const t = normMedToken(m);
        if (t)
            medByKey.set(t, m);
    }
    return [...medByKey.values()];
}
function mergeIcdSets(icd10Codes, intake, icd11FromDoctor) {
    const ten = new Set(icd10Codes.map((c) => c.trim().toUpperCase()).filter(Boolean));
    for (const c of intake?.conditions ?? []) {
        const code = c.icd10?.trim().toUpperCase();
        if (code)
            ten.add(code);
    }
    const mergedIcd10 = [...ten];
    const eleven = new Set((icd11FromDoctor ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean));
    for (const c of intake?.conditions ?? []) {
        const code = c.icd11?.trim().toUpperCase().replace(/\s+/g, "");
        if (code)
            eleven.add(code);
    }
    const mergedIcd11 = eleven.size ? [...eleven] : undefined;
    return { mergedIcd10, mergedIcd11 };
}
function buildHealthCredentialPayload(credentialId, doctorPubKeyHex, icd10Codes, issuedAt, expiresAtMs, patientId, details) {
    const intake = details?.patientIntake;
    const medications = mergeMedicationsAndIntake(intake, details?.medications);
    const { mergedIcd10, mergedIcd11 } = mergeIcdSets(icd10Codes, intake, details?.icd11Codes);
    return {
        credentialId: normalizeCredentialIdHex(credentialId),
        patientId,
        doctorPubKeyHex,
        icd10Codes: mergedIcd10,
        icd11Codes: mergedIcd11,
        ageYears: details?.ageYears,
        medications,
        labResults: details?.labResults ?? [],
        patientIntake: intake,
        issuedAt,
        expiresAt: expiresAtMs,
        signature: undefined
    };
}
export function createCredentialPayload(doctorPubKeyHex, icd10Codes, patientId, details) {
    const credentialId = createCredentialId();
    const issuedAt = Date.now();
    const expiresAt = new Date(issuedAt);
    expiresAt.setMonth(expiresAt.getMonth() + CREDENTIAL_VALIDITY_MONTHS);
    return buildHealthCredentialPayload(credentialId, doctorPubKeyHex, icd10Codes, issuedAt, expiresAt.getTime(), patientId, details);
}
/** Same logical card id across visits; refreshes issuedAt / expiresAt and merges clinical fields. */
export function createCredentialPayloadContinuingCard(existingCredentialIdHex, doctorPubKeyHex, icd10Codes, patientId, details) {
    const issuedAt = Date.now();
    const expiresAt = new Date(issuedAt);
    expiresAt.setMonth(expiresAt.getMonth() + CREDENTIAL_VALIDITY_MONTHS);
    return buildHealthCredentialPayload(normalizeCredentialIdHex(existingCredentialIdHex), doctorPubKeyHex, icd10Codes, issuedAt, expiresAt.getTime(), patientId, details);
}
export function isCredentialExpired(payload) {
    return Date.now() > payload.expiresAt;
}
/** Commitment posted on-chain for each signed diagnosis visit (32-byte SHA-256 hex). */
export async function diagnosisVisitCommitment(input) {
    const cred = normalizeCredentialIdHex(input.credentialId);
    const payload = JSON.stringify({
        v: 1,
        credentialId: cred,
        icd10: [...input.icd10Codes].map((c) => c.trim().toUpperCase()).filter(Boolean).sort(),
        icd11: [...(input.icd11Codes ?? [])].map((c) => c.trim().toUpperCase().replace(/\s+/g, "")).filter(Boolean).sort(),
        issuedAtMs: input.issuedAtMs,
        visitNonce: input.visitNonceHex.replace(/^0x/i, "").toLowerCase()
    });
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
export function randomVisitNonceHex() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
async function deriveKeyFromRequestCode(requestCode) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`zkclinic-credential:${requestCode.toUpperCase()}`);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function deriveKeyFromCardId(credentialIdHex) {
    const encoder = new TextEncoder();
    const id = normalizeCredentialIdHex(credentialIdHex);
    const data = encoder.encode(`zkclinic-credential-card:${id}`);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function encryptAesGcmJson(payload, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(payload));
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    const combined = new Uint8Array(iv.length + cipher.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipher), iv.length);
    return btoa(String.fromCharCode(...combined));
}
async function decryptAesGcmJson(encryptedBase64, key) {
    const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(decrypted));
}
/**
 * Encrypt credential JSON. First-visit default: key from request code. Continuing same card: key from credentialId.
 */
export async function encryptCredential(payload, requestCode, opts) {
    const key = opts?.useCardKey
        ? await deriveKeyFromCardId(payload.credentialId)
        : await deriveKeyFromRequestCode(requestCode);
    return encryptAesGcmJson(payload, key);
}
/**
 * Decrypt credential JSON. Tries request-code key first (legacy / first delivery), then card-id key (continuing visits).
 */
export async function decryptCredential(encryptedBase64, requestCode, credentialIdHex) {
    let last = null;
    try {
        const key = await deriveKeyFromRequestCode(requestCode);
        return await decryptAesGcmJson(encryptedBase64, key);
    }
    catch (e) {
        last = e instanceof Error ? e : new Error(String(e));
    }
    if (credentialIdHex?.trim()) {
        try {
            const key = await deriveKeyFromCardId(credentialIdHex);
            return await decryptAesGcmJson(encryptedBase64, key);
        }
        catch (e) {
            last = e instanceof Error ? e : new Error(String(e));
        }
    }
    throw last ?? new Error("Decrypt failed");
}
