/**
 * Build a patient-intake-shaped object from a stored health card so the form can
 * be prefilled for a follow-up request (same person, new visit).
 */
export function intakeForFormFromPayload(payload) {
    const merged = { ...(payload.patientIntake ?? {}) };
    const conds = [...(merged.conditions ?? [])];
    const norm10 = (c) => c.trim().toUpperCase();
    const norm11 = (c) => c.trim().toUpperCase().replace(/\s+/g, "");
    const hasIcd10 = new Set(conds.map((c) => (c.icd10 ? norm10(c.icd10) : "")).filter(Boolean));
    const hasIcd11 = new Set(conds.map((c) => (c.icd11 ? norm11(c.icd11) : "")).filter(Boolean));
    for (const code of payload.icd10Codes ?? []) {
        const u = norm10(code);
        if (!u || hasIcd10.has(u))
            continue;
        hasIcd10.add(u);
        conds.push({
            label: `Prior attestation (${u})`,
            icd10: u,
            notes: "Imported from your stored card — edit or add rows before a new visit"
        });
    }
    for (const code of payload.icd11Codes ?? []) {
        const u = norm11(code);
        if (!u || hasIcd11.has(u))
            continue;
        hasIcd11.add(u);
        conds.push({
            label: `Prior ICD-11 attestation (${u})`,
            icd11: u,
            notes: "Imported from your stored card — edit or add rows before a new visit"
        });
    }
    if (conds.length)
        merged.conditions = conds;
    else
        delete merged.conditions;
    return Object.keys(merged).length ? merged : undefined;
}
