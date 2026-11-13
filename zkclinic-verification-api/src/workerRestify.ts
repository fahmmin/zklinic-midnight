/**
 * The slice of restify that server.ts uses, on top of fetch Request/Response, so the same routes run on
 * Cloudflare Workers (restify itself needs a real Node HTTP stack). Node keeps using real restify.
 */
type Next = (arg?: unknown) => void;
type Handler = (req: ShimReq, res: ShimRes, next: Next) => unknown;
type Route = { method: string; parts: string[]; handler: Handler };

export type ShimReq = {
  method: string;
  url: string;
  body: unknown;
  query: Record<string, string>;
  params: Record<string, string>;
  header(name: string): string | undefined;
};
type ShimRes = {
  header(name: string, value: string): void;
  send(codeOrBody?: unknown, body?: unknown): void;
  json(codeOrBody?: unknown, body?: unknown): void;
};

function matchRoute(parts: string[], path: string[]): Record<string, string> | null {
  if (parts.length !== path.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]!.startsWith(":")) params[parts[i]!.slice(1)] = decodeURIComponent(path[i]!);
    else if (parts[i] !== path[i]) return null;
  }
  return params;
}

export function createServer() {
  const pre: Handler[] = [];
  const routes: Route[] = [];
  const add = (method: string) => (path: string, handler: Handler) =>
    routes.push({ method, parts: path.split("/").filter(Boolean), handler });

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const headers = new Headers({ "Content-Type": "application/json" });
    let status = 200;
    let payload: string | null = null;
    let done = false;

    const text = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      /* non-JSON body stays a string, as restify's bodyParser does */
    }
    const req: ShimReq = {
      method: request.method,
      url: url.pathname + url.search,
      body,
      query: Object.fromEntries(url.searchParams),
      params: {},
      header: (name) => request.headers.get(name) ?? undefined
    };
    const send = (codeOrBody?: unknown, maybeBody?: unknown) => {
      done = true;
      const hasCode = typeof codeOrBody === "number";
      status = hasCode ? (codeOrBody as number) : 200;
      const b = hasCode ? maybeBody : codeOrBody;
      payload = b === undefined ? null : JSON.stringify(b);
    };
    const res: ShimRes = { header: (k, v) => headers.set(k, v), send, json: send };

    const run = async (h: Handler) => {
      let stop = false;
      await h(req, res, (arg) => {
        if (arg === false) stop = true;
      });
      return stop || done;
    };

    for (const h of pre) if (await run(h)) break;
    if (!done) {
      const path = url.pathname.split("/").filter(Boolean);
      for (const r of routes) {
        if (r.method !== request.method) continue;
        const params = matchRoute(r.parts, path);
        if (!params) continue;
        req.params = params;
        await run(r.handler);
        break;
      }
    }
    if (!done) send(404, { code: "ResourceNotFound", message: `${url.pathname} does not exist` });
    return new Response(status === 204 ? null : payload, { status, headers });
  }

  return {
    pre: (h: Handler) => pre.push(h),
    use: (_h: Handler) => {}, // query and body parsing are built into handle()
    get: add("GET"),
    post: add("POST"),
    put: add("PUT"),
    del: add("DELETE"),
    listen: () => {},
    handle
  };
}

export const plugins = { queryParser: () => (() => {}) as Handler, bodyParser: () => (() => {}) as Handler };
