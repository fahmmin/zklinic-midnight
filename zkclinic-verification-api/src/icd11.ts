/**
 * ICD-11 via WHO ICD API v2 (OAuth) + optional LLM candidate generation.
 * @see https://icd.who.int/docs/icd-api/APIDoc-Version2/
 */

import { createHash } from "node:crypto";

const WHO_TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token";
const WHO_BASE = "https://id.who.int";

export type Icd11Candidate = {
  code: string;
  title: string;
  uri?: string;
  source: "who" | "llm" | "who+llm";
  validatedByWho?: boolean;
};

type TokenCache = { token: string; expMs: number };
let tokenCache: TokenCache | null = null;

function env(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

export async function getWhoAccessToken(): Promise<string | null> {
  const clientId = env("WHO_ICD_CLIENT_ID");
  const clientSecret = env("WHO_ICD_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  if (tokenCache && Date.now() < tokenCache.expMs - 60_000) {
    return tokenCache.token;
  }
  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    });
    const res = await fetch(WHO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    if (!res.ok) {
      const t = await res.text();
      // eslint-disable-next-line no-console
      console.warn("[icd11] WHO token HTTP error:", res.status, t.slice(0, 240));
      tokenCache = null;
      return null;
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) {
      // eslint-disable-next-line no-console
      console.warn("[icd11] WHO token response missing access_token");
      tokenCache = null;
      return null;
    }
    const expSec = json.expires_in ?? 3600;
    tokenCache = {
      token: json.access_token,
      expMs: Date.now() + expSec * 1000
    };
    return tokenCache.token;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[icd11] WHO token fetch failed:", e instanceof Error ? e.message : e);
    tokenCache = null;
    return null;
  }
}

function whoHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "API-Version": "v2",
    "Accept-Language": env("WHO_ICD_LANG") ?? "en"
  };
}

/** Normalize MMS-style code: strip spaces, uppercase alphanumerics. */
export function normalizeIcd11Code(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/\.(?=\d)/g, "").toUpperCase();
}

function extractEntities(json: unknown): Array<{ id?: string; title?: string; code?: string }> {
  if (json == null || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  const dest = o.destinationEntities;
  if (Array.isArray(dest)) {
    return dest.map((e) => {
      if (e == null || typeof e !== "object") return {};
      const x = e as Record<string, unknown>;
      const title =
        typeof x.title === "string"
          ? x.title
          : x.title && typeof x.title === "object" && x.title !== null && "@value" in (x.title as object)
            ? String((x.title as { "@value"?: string })["@value"] ?? "")
            : "";
      return {
        id: typeof x.id === "string" ? x.id : undefined,
        title,
        code: typeof x.code === "string" ? x.code : undefined
      };
    });
  }
  return [];
}

/**
 * Search ICD foundation / entities (WHO hosted).
 */
export async function whoSearchEntities(query: string): Promise<Icd11Candidate[]> {
  const token = await getWhoAccessToken();
  if (!token) return [];
  const q = query.trim();
  if (!q) return [];
  const url = `${WHO_BASE}/icd/entity/search?q=${encodeURIComponent(q)}&flatResults=true`;
  const res = await fetch(url, { headers: whoHeaders(token) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WHO search failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const entities = extractEntities(json);
  const out: Icd11Candidate[] = [];
  for (const e of entities.slice(0, 15)) {
    const title = e.title?.trim() || "Unknown";
    const uri = e.id;
    const code = e.code?.trim() || (uri ? (uri.split("/").pop() ?? "") : "");
    if (!code && !uri) continue;
    out.push({
      code: code || normalizeIcd11Code(title).slice(0, 16) || "ENTITY",
      title,
      uri,
      source: "who",
      validatedByWho: true
    });
  }
  return dedupeCandidates(out);
}

function dedupeCandidates(c: Icd11Candidate[]): Icd11Candidate[] {
  const seen = new Set<string>();
  const r: Icd11Candidate[] = [];
  for (const x of c) {
    const k = `${x.code}|${x.title}`.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    r.push(x);
  }
  return r;
}

/**
 * Resolve MMS linearization code to title (requires release id).
 */
export async function whoLookupMmsCode(codeRaw: string): Promise<Icd11Candidate | null> {
  const token = await getWhoAccessToken();
  if (!token) return null;
  const release = env("WHO_ICD_RELEASE_ID") ?? "2023-01";
  const code = normalizeIcd11Code(codeRaw);
  if (!code) return null;
  const url = `${WHO_BASE}/icd/release/11/${release}/mms/${encodeURIComponent(code)}`;
  const res = await fetch(url, { headers: whoHeaders(token) });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  const title =
    typeof json.title === "string"
      ? json.title
      : json.title && typeof json.title === "object" && json.title !== null
        ? String((json.title as { "@value"?: string })["@value"] ?? "")
        : "";
  const id = typeof json["@id"] === "string" ? json["@id"] : undefined;
  return {
    code,
    title: title || code,
    uri: id,
    source: "who",
    validatedByWho: true
  };
}

/**
 * LLM suggests ICD-11 MMS-like codes; WHO validates when credentials exist.
 */
export async function llmSuggestIcd11Codes(clinicalText: string): Promise<Icd11Candidate[]> {
  const apiKey = env("ICD_LLM_API_KEY");
  const apiUrl = env("ICD_LLM_API_URL") ?? "https://api.openai.com/v1/chat/completions";
  const model = env("ICD_LLM_MODEL") ?? "gpt-4o-mini";
  if (!apiKey || !clinicalText.trim()) return [];

  const prompt = `You are a medical coding assistant. Given plain-language clinical text, propose up to 5 ICD-11 MMS stem codes (short alphanumeric like 5A11, 8E02, 1F57) with a short English title each.
Return ONLY valid JSON: {"candidates":[{"code":"...","title":"..."}]}
Text: ${clinicalText.slice(0, 2000)}`;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM ICD mapping failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  let parsed: { candidates?: Array<{ code?: string; title?: string }> };
  try {
    parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
  } catch {
    return [];
  }
  const out: Icd11Candidate[] = [];
  for (const c of parsed.candidates ?? []) {
    const code = normalizeIcd11Code(String(c.code ?? ""));
    const title = String(c.title ?? "").trim();
    if (code.length >= 3 && title) {
      out.push({ code, title, source: "llm", validatedByWho: false });
    }
  }
  return dedupeCandidates(out);
}

export async function validateCandidatesWithWho(
  candidates: Icd11Candidate[]
): Promise<Icd11Candidate[]> {
  const token = await getWhoAccessToken();
  if (!token) return candidates;
  const out: Icd11Candidate[] = [];
  for (const c of candidates) {
    const hit = await whoLookupMmsCode(c.code);
    if (hit) {
      out.push({
        ...hit,
        source: c.source === "llm" ? "who+llm" : c.source,
        validatedByWho: true
      });
    } else {
      out.push({ ...c, validatedByWho: false });
    }
  }
  return dedupeCandidates(out);
}

/**
 * Plain text -> ICD-11: LLM first, then WHO validation; supplement with WHO search if LLM empty.
 */
export async function textToIcd11Pipeline(text: string): Promise<{
  candidates: Icd11Candidate[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  let candidates: Icd11Candidate[] = [];
  try {
    candidates = await llmSuggestIcd11Codes(text);
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : String(e));
  }
  if (candidates.length === 0) {
    try {
      candidates = await whoSearchEntities(text);
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : String(e));
    }
  }
  try {
    candidates = await validateCandidatesWithWho(candidates);
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : String(e));
  }
  if (!env("WHO_ICD_CLIENT_ID")) {
    warnings.push("WHO_ICD_CLIENT_ID/SECRET not set — ICD-11 codes are not validated against WHO.");
  }
  return { candidates, warnings };
}

export async function codeToIcd11Text(codeRaw: string): Promise<{
  candidate: Icd11Candidate | null;
  warnings: string[];
}> {
  const warnings: string[] = [];
  if (!env("WHO_ICD_CLIENT_ID")) {
    warnings.push("WHO credentials not configured — cannot resolve ICD-11 code.");
    return { candidate: null, warnings };
  }
  try {
    const candidate = await whoLookupMmsCode(codeRaw);
    if (!candidate) warnings.push("Code not found in ICD-11 MMS for this release.");
    return { candidate, warnings };
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : String(e));
    return { candidate: null, warnings };
  }
}

export function sha256HexUtf8Sync(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
