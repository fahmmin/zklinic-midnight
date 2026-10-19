/**
 * ICD-10-CM search via NLM Clinical Tables API.
 * @see https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc
 */

const ICD10_API = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";

export interface ICD10Entry {
  code: string;
  name: string;
}

/** Search ICD-10-CM codes by term. Returns code + name. */
export async function searchICD10(
  terms: string,
  maxResults = 10
): Promise<ICD10Entry[]> {
  if (!terms.trim()) return [];
  const url = `${ICD10_API}?terms=${encodeURIComponent(terms)}&sf=code,name&maxList=${Math.min(maxResults, 50)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  // API returns [total, [[code, name], ...]] or similar
  const results = Array.isArray(data) ? data[1] ?? data : data.results ?? data.display_strings ?? [];
  if (!Array.isArray(results)) return [];
  return results.map((r: unknown) => {
    const arr = Array.isArray(r) ? r : [r];
    return { code: String(arr[0] ?? ""), name: String(arr[1] ?? arr[0] ?? "") };
  });
}

/** Demo fallback codes when API unavailable. */
/** Resolve exact ICD-10-CM code via NLM API (validates code exists). */
export async function resolveIcd10Exact(code: string): Promise<ICD10Entry | null> {
  const q = code.trim().toUpperCase();
  if (!q) return null;
  const url = `${ICD10_API}?terms=${encodeURIComponent(q)}&sf=code,name&maxList=30`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const rows = Array.isArray(data) ? data[1] ?? [] : [];
  if (!Array.isArray(rows)) return null;
  for (const r of rows) {
    const arr = Array.isArray(r) ? r : [r];
    const c = String(arr[0] ?? "").toUpperCase();
    if (c === q) {
      return { code: c, name: String(arr[1] ?? arr[0] ?? "") };
    }
  }
  return null;
}

export const DEMO_ICD10_CODES: ICD10Entry[] = [
  { code: "E11.9", name: "Type 2 diabetes mellitus without complications" },
  { code: "E10.9", name: "Type 1 diabetes mellitus without complications" },
  { code: "I10", name: "Essential (primary) hypertension" },
  { code: "J45.20", name: "Mild intermittent asthma" },
  { code: "M54.5", name: "Low back pain" },
  { code: "F32.9", name: "Major depressive disorder, single episode, unspecified" },
  { code: "E66.9", name: "Obesity, unspecified" },
  { code: "G47.33", name: "Obstructive sleep apnea" }
];
