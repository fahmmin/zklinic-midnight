/**
 * Friendly "health evidence" score for the patient card (0–100).
 * Not a medical score — reflects credential validity + time-to-expiry only.
 */
export function computeHealthEvidenceScore(opts) {
    const now = opts.now ?? Date.now();
    if (opts.revoked || opts.expired)
        return 0;
    const msLeft = Math.max(0, opts.expiresAt - now);
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    const freshness = Math.min(1, msLeft / yearMs);
    return Math.round(55 + 45 * freshness);
}
export function formatShortId(hex, head = 4, tail = 4) {
    const clean = hex.replace(/^0x/i, "");
    if (clean.length <= head + tail)
        return clean;
    return `${clean.slice(0, head)}…${clean.slice(-tail)}`;
}
export function proofExpiresInLabel(expiresAt, now) {
    const t = now ?? Date.now();
    const ms = expiresAt - t;
    if (ms <= 0)
        return "Expired";
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days >= 1)
        return `${days} day${days === 1 ? "" : "s"} left`;
    if (hours >= 1)
        return `${hours} hour${hours === 1 ? "" : "s"} left`;
    const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
    return `${mins} min left`;
}
