import { describe, expect, it } from "vitest";
import { RegistryState } from "../state.js";

describe("registry state", () => {
  it("handles submit -> approve -> revoke", () => {
    const state = new RegistryState();
    state.submit("doctor1", "0xabc");
    expect(state.listPending()).toHaveLength(1);

    state.approve("doctor1");
    expect(state.listPending()).toHaveLength(0);
    expect(state.listIssuers()[0]?.status).toBe("approved");

    state.revoke("doctor1");
    expect(state.listIssuers()[0]?.status).toBe("revoked");
  });
});
