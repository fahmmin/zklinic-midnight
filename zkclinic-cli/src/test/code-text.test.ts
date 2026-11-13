import { describe, expect, it } from "vitest";
import { codeBytes } from "zkclinic-contract";
import { codeText } from "../api.js";

describe("codeText (state printer)", () => {
  it("inverts codeBytes and marks unset rules", () => {
    expect(codeText(codeBytes(" e11.9 "))).toBe("E11.9");
    expect(codeText(new Uint8Array(32))).toBe("-");
  });
});
