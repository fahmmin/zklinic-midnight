/**
 * Structured JSON extraction via Google Gemini (GEMINI_API_KEY).
 * Used for trial-criteria and patient-intake form autofill.
 */

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export async function geminiGenerateJson(systemPreamble: string, userPrompt: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = DEFAULT_MODEL.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPreamble.trim()}\n\n---\nUser input:\n${userPrompt.trim()}` }]
      }
    ],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new Error(data.error.message);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    throw new Error("Empty Gemini response");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as unknown;
    throw new Error("Gemini returned non-JSON");
  }
}
