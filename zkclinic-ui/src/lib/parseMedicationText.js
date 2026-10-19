/** Split OCR or pasted text into medication name tokens. */
export function parseMedicationText(text) {
    const seen = new Set();
    const out = [];
    for (const part of text.split(/[\n,;•·|]+/)) {
        const s = part.replace(/^\s*[-*]\s*/, "").trim();
        if (s.length < 2 || s.length > 200)
            continue;
        const key = s.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(s);
    }
    return out;
}
