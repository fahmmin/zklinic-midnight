import { describe, expect, it } from "vitest";
import { extractNmcHintsFromText } from "./extractNmcFields";
describe("extractNmcHintsFromText", () => {
    it("extracts doctor id and registration hints", () => {
        const t = `
      Doctor ID: 12586057
      Reg. No. 8506
      Name: Pankaj Kumar
      State Medical Council: West Bengal Medical Council
    `;
        const h = extractNmcHintsFromText(t);
        expect(h.doctorId).toBe("12586057");
        expect(h.registrationNo).toBe("8506");
        expect(h.nameHint).toMatch(/Pankaj/i);
        expect(h.smcHint).toMatch(/West Bengal/i);
    });
});
