export const PROOF_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
/** Default minimum match score (non-exclusion criteria) to count as eligible. */
export const DEFAULT_ELIGIBILITY_THRESHOLD_PERCENT = 75;
/** Hard exclusion rules — must pass; not subject to threshold. */
const EXCLUSION_KEYS = new Set(["exclusion-diagnosis", "exclusion-medications"]);
function normalizeCode(code) {
    return code.trim().toUpperCase();
}
function normalizeIcd11Code(code) {
    return code.trim().toUpperCase().replace(/\s+/g, "");
}
function normalizeToken(token) {
    return token.trim().toLowerCase();
}
function icd10SetFromCredential(credential) {
    const s = new Set((credential.icd10Codes ?? []).map((c) => normalizeCode(c)));
    for (const cond of credential.patientIntake?.conditions ?? []) {
        if (cond.icd10?.trim())
            s.add(normalizeCode(cond.icd10));
    }
    return s;
}
function icd11SetFromCredential(credential) {
    const s = new Set((credential.icd11Codes ?? []).map((c) => normalizeIcd11Code(c)));
    for (const cond of credential.patientIntake?.conditions ?? []) {
        if (cond.icd11?.trim())
            s.add(normalizeIcd11Code(cond.icd11));
    }
    return s;
}
function medicationTokensFromCredential(credential) {
    const meds = new Set((credential.medications ?? []).map((m) => normalizeToken(m)));
    for (const m of credential.patientIntake?.medicationsList ?? []) {
        const t = normalizeToken(m);
        if (t)
            meds.add(t);
    }
    return meds;
}
function formatDiagnosisList(codes) {
    return codes.map((code) => normalizeCode(code)).join(", ");
}
function findLabResult(labs, testName) {
    const normalized = normalizeToken(testName);
    return labs.find((lab) => normalizeToken(lab.testName) === normalized);
}
function compareLabValue(actual, criterion) {
    switch (criterion.operator) {
        case "=":
            return actual === criterion.threshold;
        case "<":
            return actual < criterion.threshold;
        case ">":
            return actual > criterion.threshold;
        case "<=":
            return actual <= criterion.threshold;
        case ">=":
            return actual >= criterion.threshold;
        default:
            return false;
    }
}
export function diagnosisCategoryForCode(code) {
    const prefix = normalizeCode(code).charAt(0);
    switch (prefix) {
        case "C":
        case "D":
            return "Oncology";
        case "E":
            return "Endocrine";
        case "F":
            return "Mental health";
        case "G":
            return "Neurology";
        case "I":
            return "Cardiovascular";
        case "J":
            return "Respiratory";
        case "K":
            return "Gastrointestinal";
        case "M":
            return "Musculoskeletal";
        case "N":
            return "Renal";
        default:
            return "Other";
    }
}
export function trialDiagnosisCategories(criteria) {
    const codes = [...(criteria.inclusionIcd10 ?? []), ...(criteria.inclusionIcd11 ?? [])];
    return Array.from(new Set(codes.map((code) => diagnosisCategoryForCode(code)))).sort();
}
/**
 * Merge API trial criteria with on-chain threshold when metadata omits it (older listings).
 */
export function criteriaForEvaluation(criteria, chain) {
    if (criteria.eligibilityThresholdPercent != null)
        return criteria;
    if (chain) {
        return {
            ...criteria,
            eligibilityThresholdPercent: Math.round(Number(chain.eligibilityThresholdBps) / 100)
        };
    }
    return criteria;
}
function resolveThresholdPercent(criteria) {
    const t = criteria.eligibilityThresholdPercent;
    if (t == null || !Number.isFinite(t))
        return DEFAULT_ELIGIBILITY_THRESHOLD_PERCENT;
    return Math.min(100, Math.max(1, Math.round(t)));
}
function computeMatchScore(criterionResults, thresholdPercent) {
    const blockedByExclusion = criterionResults.some((c) => EXCLUSION_KEYS.has(c.key) && !c.passed);
    const scoreable = criterionResults.filter((c) => !EXCLUSION_KEYS.has(c.key));
    const passedScore = scoreable.filter((c) => c.passed).length;
    const totalScore = scoreable.length;
    const matchPercent = totalScore === 0 ? 100 : Math.round((100 * passedScore) / totalScore);
    if (blockedByExclusion) {
        return { matchPercent, eligible: false, blockedByExclusion: true };
    }
    const eligible = matchPercent >= thresholdPercent;
    return { matchPercent, eligible, blockedByExclusion: false };
}
export function evaluateTrialEligibility(criteria, credential) {
    const thresholdPercent = resolveThresholdPercent(criteria);
    const credentialCodes = icd10SetFromCredential(credential);
    const credentialIcd11 = icd11SetFromCredential(credential);
    const meds = medicationTokensFromCredential(credential);
    const criterionResults = [];
    const inc10 = criteria.inclusionIcd10 ?? [];
    const inc11 = criteria.inclusionIcd11 ?? [];
    if (inc10.length > 0 || inc11.length > 0) {
        const required10 = inc10.map((code) => normalizeCode(code));
        const required11 = inc11.map((code) => normalizeIcd11Code(code));
        const passed = required10.some((code) => credentialCodes.has(code)) ||
            required11.some((code) => credentialIcd11.has(code));
        const needParts = [];
        if (required10.length)
            needParts.push(`ICD-10: ${formatDiagnosisList(required10)}`);
        if (required11.length)
            needParts.push(`ICD-11: ${required11.join(", ")}`);
        criterionResults.push({
            key: "inclusion-diagnosis",
            label: "Required diagnosis match",
            detail: `Needs one of ${needParts.join(" · ")}`,
            passed
        });
    }
    const exc10 = criteria.exclusionIcd10 ?? [];
    const exc11 = criteria.exclusionIcd11 ?? [];
    if (exc10.length > 0 || exc11.length > 0) {
        const excluded10 = exc10.map((code) => normalizeCode(code));
        const excluded11 = exc11.map((code) => normalizeIcd11Code(code));
        const conflicts10 = excluded10.filter((code) => credentialCodes.has(code));
        const conflicts11 = excluded11.filter((code) => credentialIcd11.has(code));
        const conflicts = [...conflicts10, ...conflicts11];
        criterionResults.push({
            key: "exclusion-diagnosis",
            label: "Excluded diagnoses absent",
            detail: conflicts.length > 0
                ? `Conflicts: ICD-10 [${formatDiagnosisList(conflicts10)}] ICD-11 [${conflicts11.join(", ")}]`
                : `No excluded diagnoses (${[...excluded10, ...excluded11].join(", ")})`,
            passed: conflicts.length === 0
        });
    }
    if (criteria.exclusionMedications.length > 0) {
        const excluded = criteria.exclusionMedications.map((medication) => normalizeToken(medication));
        const conflicts = excluded.filter((medication) => meds.has(medication));
        criterionResults.push({
            key: "exclusion-medications",
            label: "Excluded medications absent",
            detail: conflicts.length > 0
                ? `Conflicts: ${conflicts.join(", ")}`
                : `No excluded medications found (${criteria.exclusionMedications.join(", ")})`,
            passed: conflicts.length === 0
        });
    }
    if (criteria.ageMin != null || criteria.ageMax != null) {
        const age = credential.ageYears;
        const passed = age != null &&
            (criteria.ageMin == null || age >= criteria.ageMin) &&
            (criteria.ageMax == null || age <= criteria.ageMax);
        criterionResults.push({
            key: "age-range",
            label: "Age in range",
            detail: age == null
                ? `Credential missing age; required ${criteria.ageMin ?? "any"}-${criteria.ageMax ?? "any"}`
                : `Credential age ${age}; required ${criteria.ageMin ?? "any"}-${criteria.ageMax ?? "any"}`,
            passed
        });
    }
    for (const [index, lab] of criteria.labCriteria.entries()) {
        const result = findLabResult(credential.labResults ?? [], lab.testName);
        const passed = result ? compareLabValue(result.value, lab) : false;
        criterionResults.push({
            key: `lab-${index}`,
            label: `Lab: ${lab.testName}`,
            detail: result
                ? `${result.value} ${result.unit} ${lab.operator} ${lab.threshold} ${lab.unit}`.trim()
                : `Missing ${lab.testName}; needs ${lab.operator} ${lab.threshold} ${lab.unit}`.trim(),
            passed
        });
    }
    const score = computeMatchScore(criterionResults, thresholdPercent);
    return {
        ...score,
        thresholdPercent,
        criterionResults
    };
}
export async function deriveTrialPseudonym(credentialId, trialId) {
    const input = new TextEncoder().encode(`zkclinic-pseudonym:${credentialId.replace(/^0x/, "").toLowerCase()}:${trialId.replace(/^0x/, "").toLowerCase()}`);
    const digest = await crypto.subtle.digest("SHA-256", input);
    return Array.from(new Uint8Array(digest))
        .slice(0, 12)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
