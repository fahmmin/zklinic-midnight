/**
 * ICD-11 conversion via zkclinic-verification-api (LLM + WHO).
 */
const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";
export async function icd11TextToCodes(text) {
    const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/icd11/text-to-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });
    if (!res.ok)
        throw new Error(`ICD-11 text-to-code failed: ${res.status}`);
    return (await res.json());
}
export async function icd11CodeToText(code) {
    const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/icd11/code-to-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
    });
    if (!res.ok)
        throw new Error(`ICD-11 code lookup failed: ${res.status}`);
    return (await res.json());
}
