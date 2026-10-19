import { describe, expect, it } from "vitest";
import { computeVerificationPayloadHash, hashNmcPayload, scoreNmcMatch } from "./nmcDoctorVerification.js";

describe("scoreNmcMatch", () => {
  it("returns high confidence when id and registration match", () => {
    const { riskBand, confidence } = scoreNmcMatch({
      doctorId: "12586057",
      regdNoValue: "8506",
      nmc: {
        doctorId: 12586057,
        registrationNo: "8506",
        firstName: "Jane",
        smcName: "Test Council"
      }
    });
    expect(riskBand).toBe("high");
    expect(confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("returns medium or low when doctorId does not match NMC record", () => {
    const { riskBand } = scoreNmcMatch({
      doctorId: "12586057",
      regdNoValue: "8506",
      nmc: {
        doctorId: 99999999,
        registrationNo: "8506",
        firstName: "Jane"
      }
    });
    expect(["medium", "low"]).toContain(riskBand);
  });
});

describe("hash stability", () => {
  it("computeVerificationPayloadHash is deterministic", () => {
    const a = computeVerificationPayloadHash({
      doctorId: "1",
      regdNoValue: "2",
      nmcRecordHash: "abc",
      licenseHash: "d".repeat(64)
    });
    const b = computeVerificationPayloadHash({
      doctorId: "1",
      regdNoValue: "2",
      nmcRecordHash: "abc",
      licenseHash: "d".repeat(64)
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("hashNmcPayload orders keys", () => {
    const h1 = hashNmcPayload({ a: 1, b: 2 } as never);
    const h2 = hashNmcPayload({ b: 2, a: 1 } as never);
    expect(h1).toBe(h2);
  });
});
