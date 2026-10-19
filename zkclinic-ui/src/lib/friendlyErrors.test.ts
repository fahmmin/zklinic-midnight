import { describe, expect, it } from "vitest";
import { friendlyErrorMessage } from "./friendlyErrors";

describe("friendlyErrorMessage", () => {
  it("maps fetch failures", () => {
    expect(friendlyErrorMessage("Failed to fetch")).toContain("verification API");
  });

  it("passes through unknown messages", () => {
    expect(friendlyErrorMessage("Custom xyz")).toBe("Custom xyz");
  });
});
