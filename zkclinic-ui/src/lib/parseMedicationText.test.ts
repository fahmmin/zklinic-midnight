import { describe, expect, it } from "vitest";
import { parseMedicationText } from "./parseMedicationText";

describe("parseMedicationText", () => {
  it("splits on commas and newlines", () => {
    expect(parseMedicationText("Aspirin, B12\nVitamin D")).toEqual(["Aspirin", "B12", "Vitamin D"]);
  });

  it("dedupes case-insensitively", () => {
    expect(parseMedicationText("Foo, foo")).toEqual(["Foo"]);
  });
});
