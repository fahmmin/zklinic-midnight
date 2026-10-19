/**
 * Merges clinician-selected ICD codes into patient intake conditions so each
 * signed delivery appends attestations to the narrative card (deduped by code).
 */
export function mergeIntakeWithDoctorDiagnoses(base, icd10, icd11) {
    const merged = base ? { ...base } : {};
    const conds = [...(merged.conditions ?? [])];
    const norm10 = (c) => c.trim().toUpperCase();
    const norm11 = (c) => c.trim().toUpperCase().replace(/\s+/g, "");
    const hasIcd10 = new Set(conds.map((c) => (c.icd10 ? norm10(c.icd10) : "")).filter(Boolean));
    const hasIcd11 = new Set(conds.map((c) => (c.icd11 ? norm11(c.icd11) : "")).filter(Boolean));
    const stamp = `Clinician attested ${new Date().toISOString().slice(0, 10)}`;
    for (const { code, name } of icd10) {
        const u = norm10(code);
        if (!u || hasIcd10.has(u))
            continue;
        hasIcd10.add(u);
        conds.push({
            label: name.trim() || u,
            icd10: u,
            notes: stamp
        });
    }
    for (const { code, title } of icd11) {
        const u = norm11(code);
        if (!u || hasIcd11.has(u))
            continue;
        hasIcd11.add(u);
        conds.push({
            label: title.trim() || u,
            icd11: u,
            notes: stamp
        });
    }
    if (conds.length)
        merged.conditions = conds;
    else
        delete merged.conditions;
    return Object.keys(merged).length ? merged : undefined;
}
