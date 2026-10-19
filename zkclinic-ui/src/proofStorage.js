const STORAGE_KEY = "zkclinic-proofs";
export function getStoredProofs() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
export function replaceStoredProofs(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
export function upsertStoredProof(meta) {
    const list = getStoredProofs();
    const existingIndex = list.findIndex((proof) => proof.proofId === meta.proofId);
    if (existingIndex >= 0) {
        list[existingIndex] = meta;
    }
    else {
        list.unshift(meta);
    }
    replaceStoredProofs(list);
}
