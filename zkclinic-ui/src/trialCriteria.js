/**
 * Milestone 3: Trial eligibility criteria (off-chain payload; criteriaHash on-chain).
 */
/**
 * Criteria exactly as they survive `JSON.stringify` → parse on the wire.
 * Optional fields with `undefined` are omitted in transit; hashing must use this shape or the
 * server’s recomputed hash will not match (see README: trial criteria hash).
 */
export function trialCriteriaWireForm(c) {
    return JSON.parse(JSON.stringify(c));
}
/** Deterministic JSON for hashing (must match verification API). */
export function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((x) => stableStringify(x)).join(",")}]`;
    }
    const obj = value;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
export async function sha256HexUtf8(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
export async function criteriaHashHex(criteria) {
    return sha256HexUtf8(stableStringify(trialCriteriaWireForm(criteria)));
}
/** Human-readable summary for patient-facing browse (uses resolved names when provided). */
export function formatCriteriaPlainLanguage(c, icdNames) {
    const lines = [];
    lines.push(c.title);
    if (c.shortDescription)
        lines.push(c.shortDescription);
    if (c.inclusionIcd10.length) {
        lines.push("Inclusion ICD-10: " +
            c.inclusionIcd10
                .map((code) => `${code} (${icdNames[code] ?? code})`)
                .join("; "));
    }
    if (c.inclusionIcd11?.length) {
        lines.push("Inclusion ICD-11: " +
            c.inclusionIcd11.map((code) => `${code} (${icdNames[code] ?? code})`).join("; "));
    }
    if (c.exclusionIcd10.length) {
        lines.push("Exclusion ICD-10: " +
            c.exclusionIcd10.map((code) => `${code} (${icdNames[code] ?? code})`).join("; "));
    }
    if (c.exclusionIcd11?.length) {
        lines.push("Exclusion ICD-11: " +
            c.exclusionIcd11.map((code) => `${code} (${icdNames[code] ?? code})`).join("; "));
    }
    if (c.exclusionMedications.length) {
        lines.push("Exclusion medications: " + c.exclusionMedications.join(", "));
    }
    if (c.ageMin != null || c.ageMax != null) {
        lines.push(`Age: ${c.ageMin ?? "any"} – ${c.ageMax ?? "any"} years`);
    }
    if (c.labCriteria.length) {
        for (const lab of c.labCriteria) {
            lines.push(`${lab.testName} ${lab.operator} ${lab.threshold} ${lab.unit}`.trim());
        }
    }
    const th = c.eligibilityThresholdPercent ?? 75;
    lines.push(`Minimum match score: ${th}% (exclusions always block)`);
    return lines;
}
export function validateTrialCriteriaShape(c) {
    const err = [];
    if (!c.title?.trim())
        err.push("Title is required");
    if (!c.inclusionIcd10?.length && !c.inclusionIcd11?.length) {
        err.push("At least one inclusion ICD-10 or ICD-11 code is required");
    }
    if (c.ageMin != null && (c.ageMin < 0 || c.ageMin > 120))
        err.push("ageMin must be 0–120");
    if (c.ageMax != null && (c.ageMax < 0 || c.ageMax > 120))
        err.push("ageMax must be 0–120");
    if (c.ageMin != null &&
        c.ageMax != null &&
        c.ageMin > c.ageMax) {
        err.push("ageMin cannot exceed ageMax");
    }
    for (const code of c.inclusionIcd10 ?? []) {
        if (!code.trim() || code.trim().length < 2)
            err.push("Each inclusion code must be non-empty");
    }
    for (const lab of c.labCriteria ?? []) {
        if (!lab.testName?.trim())
            err.push("Each lab row needs a test name");
        if (Number.isNaN(lab.threshold))
            err.push("Lab threshold must be a number");
    }
    const tp = c.eligibilityThresholdPercent;
    if (tp != null && (tp < 1 || tp > 100 || !Number.isFinite(tp))) {
        err.push("eligibilityThresholdPercent must be between 1 and 100");
    }
    return err;
}
/** Convert percent (e.g. 75) to basis points (7500) for on-chain `eligibilityThresholdBps`. */
export function eligibilityPercentToBps(percent) {
    const p = Math.round(percent * 100);
    if (p < 100 || p > 10000)
        throw new Error("Threshold percent must be 1–100");
    return BigInt(p);
}
