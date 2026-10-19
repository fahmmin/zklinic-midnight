import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadPersistedJson, savePersistedJson, type PersistedEnvelopeV1 } from "./diskPersistence.js";

const tmpRoot = join(process.cwd(), "test-tmp-disk-persist");

describe("diskPersistence", () => {
  beforeEach(() => {
    mkdirSync(tmpRoot, { recursive: true });
  });
  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("round-trips v1 envelope", () => {
    const path = join(tmpRoot, "store.json");
    const envelope: PersistedEnvelopeV1 = {
      v: 1,
      credentialRequests: [["ABC", { requestId: "x" }]],
      trialsStore: [["aa", { trialIdHex: "aa" }]],
      proofsStore: [["p1", { proofId: "p1" }]]
    };
    savePersistedJson(path, envelope);
    expect(existsSync(path)).toBe(true);
    const loaded = loadPersistedJson(path);
    expect(loaded?.v).toBe(1);
    expect(loaded?.credentialRequests.length).toBe(1);
  });
});
