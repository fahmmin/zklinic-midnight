/**
 * ICD-11 conversion via zkclinic-verification-api (LLM + WHO).
 */

const VERIFICATION_API_URL = import.meta.env.VITE_VERIFICATION_API_URL || "http://localhost:4100";

export type Icd11Candidate = {
  code: string;
  title: string;
  uri?: string;
  source: string;
  validatedByWho?: boolean;
};

export async function icd11TextToCodes(text: string): Promise<{
  candidates: Icd11Candidate[];
  warnings: string[];
}> {
  const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/icd11/text-to-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`ICD-11 text-to-code failed: ${res.status}`);
  return (await res.json()) as { candidates: Icd11Candidate[]; warnings: string[] };
}

export async function icd11CodeToText(code: string): Promise<{
  candidate: Icd11Candidate | null;
  warnings: string[];
}> {
  const res = await fetch(`${VERIFICATION_API_URL.replace(/\/$/, "")}/icd11/code-to-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
  if (!res.ok) throw new Error(`ICD-11 code lookup failed: ${res.status}`);
  return (await res.json()) as { candidate: Icd11Candidate | null; warnings: string[] };
}
