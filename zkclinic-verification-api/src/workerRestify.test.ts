import { describe, expect, it } from "vitest";
import { createZkClinicServer } from "./server.js";
import * as shim from "./workerRestify.js";

const makeApi = () => {
  let saved: unknown = null;
  const { server } = createZkClinicServer({
    restify: shim,
    persistence: { load: () => null, save: (d) => void (saved = d) }
  });
  return { handle: (server as unknown as ReturnType<typeof shim.createServer>).handle, saved: () => saved };
};

describe("workers restify shim", () => {
  it("routes the real API: CORS preflight, JSON body, path params, query, 404", async () => {
    const { handle } = makeApi();
    const pre = await handle(new Request("http://x/trials", { method: "OPTIONS", headers: { Origin: "https://a.test" } }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Origin")).toBe("https://a.test");

    const created = await handle(new Request("http://x/credential-requests", { method: "POST", body: "{}" }));
    expect(created.status).toBe(201);
    const { requestCode } = (await created.json()) as { requestCode: string };

    const got = await handle(new Request(`http://x/credential-requests/${requestCode}`));
    expect(((await got.json()) as { requestCode: string }).requestCode).toBe(requestCode);

    const bad = await handle(new Request("http://x/issuer-registration/status?doctorPubKeyHex=zz"));
    expect(bad.status).toBe(400);
    expect((await handle(new Request("http://x/nope"))).status).toBe(404);
  });
});
