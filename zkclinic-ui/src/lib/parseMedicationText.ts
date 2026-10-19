/** Split OCR or pasted text into medication name tokens. */
export function parseMedicationText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n,;•·|]+/)) {
    const s = part.replace(/^\s*[-*]\s*/, "").trim();
    if (s.length < 2 || s.length > 200) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
