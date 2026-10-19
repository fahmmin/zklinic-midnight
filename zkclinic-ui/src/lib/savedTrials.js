const STORAGE_KEY = "zkclinic-saved-trials";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Trial ids (lowercase hex) the patient bookmarked on this device. Never leaves the browser. */
export function loadSavedTrialIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((v) => typeof v === "string").map((v) => v.toLowerCase());
    }
    catch {
        return [];
    }
}
export function persistSavedTrialIds(ids) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
    catch {
        /* private mode / quota — bookmarks just won't persist */
    }
}
/** Pure toggle: returns a new list with `trialIdHex` added or removed. */
export function toggleSavedTrialId(ids, trialIdHex) {
    const id = trialIdHex.toLowerCase();
    return ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id];
}
/** Human label for a trial deadline (ms since epoch) relative to `now`. */
export function deadlineUrgency(deadlineMs, now = Date.now()) {
    const remaining = deadlineMs - now;
    if (!Number.isFinite(deadlineMs))
        return { tone: "ok", label: "No deadline" };
    if (remaining <= 0)
        return { tone: "closed", label: "Deadline passed" };
    if (remaining < HOUR_MS)
        return { tone: "soon", label: "Closes in under 1h" };
    if (remaining < DAY_MS)
        return { tone: "soon", label: `Closes in ${Math.floor(remaining / HOUR_MS)}h` };
    const days = Math.floor(remaining / DAY_MS);
    return { tone: days <= 3 ? "soon" : "ok", label: `Closes in ${days}d` };
}
/** 0–100 fill percentage for a slots progress bar. */
export function slotsFillPercent(filled, total) {
    const t = Number(total);
    if (!(t > 0))
        return 0;
    return Math.max(0, Math.min(100, Math.round((Number(filled) / t) * 100)));
}
