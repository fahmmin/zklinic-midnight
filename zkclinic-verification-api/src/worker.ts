/**
 * Cloudflare Workers entry. Every request goes to one Durable Object, so the API keeps a single in-memory
 * state (like the Node server) and persists it to Durable Object storage instead of a JSON file.
 * Config comes from Worker vars/secrets via process.env (nodejs_compat).
 */
import { DurableObject } from "cloudflare:workers";
import type { PersistedEnvelopeV1 } from "./diskPersistence.js";
import { createZkClinicServer } from "./server.js";
import * as shim from "./workerRestify.js";

type Env = { API: DurableObjectNamespace<ZkClinicApi> };
const STORE_KEY = "store-v1";

export class ZkClinicApi extends DurableObject<Env> {
  private handle!: (request: Request) => Promise<Response>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      // shortcut: one JSON value (SQLite-backed DO limit ~2 MB), fine for a demo; split per store if it grows.
      const saved = (await ctx.storage.get<PersistedEnvelopeV1>(STORE_KEY)) ?? null;
      const { server } = createZkClinicServer({
        restify: shim,
        persistence: {
          load: () => saved,
          save: (data) => void ctx.storage.put(STORE_KEY, data)
        }
      });
      this.handle = (server as unknown as ReturnType<typeof shim.createServer>).handle;
    });
  }

  fetch(request: Request): Promise<Response> {
    return this.handle(request);
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.API.get(env.API.idFromName("main")).fetch(request);
  }
} satisfies ExportedHandler<Env>;
