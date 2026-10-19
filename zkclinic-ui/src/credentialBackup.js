export function exportCredentialBackup(credentials, proofs) {
    const payload = {
        version: 1,
        exportedAt: Date.now(),
        credentials,
        proofs
    };
    return JSON.stringify(payload, null, 2);
}
export function parseCredentialBackup(text) {
    const parsed = JSON.parse(text);
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
