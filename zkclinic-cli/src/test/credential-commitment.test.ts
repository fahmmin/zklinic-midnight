import { describe, expect, it } from "vitest";
import { diagnosisVisitCommitmentSync } from "../credential-node.js";

describe("diagnosisVisitCommitmentSync (parity with zkclinic-ui credential.ts)", () => {
  const base = {
    issuedAtMs: 1_700_000_000_000,
    visitNonceHex: "0123456789abcdef0123456789abcdef"
  };

  it("matches golden SHA-256 for fixed payload (icd11 empty)", () => {
    const h = diagnosisVisitCommitmentSync({
      credentialId: "aabbccdd",
      icd10Codes: ["J45", "E11"],
      issuedAtMs: base.issuedAtMs,
      visitNonceHex: base.visitNonceHex
    });
    expect(h).toBe("44d8a44c5b701137cde3273c62759f041a8ac1227cf1ddb793cce2688f88f542");
  });

  it("matches golden with icd11 normalization (same rules as UI)", () => {
    const h = diagnosisVisitCommitmentSync({
      credentialId: "aabbccdd",
      icd10Codes: ["J45", "E11"],
      icd11Codes: ["AB CD", "ef"],
      issuedAtMs: base.issuedAtMs,
      visitNonceHex: base.visitNonceHex
    });
    expect(h).toBe("2cc4dd61f81201840d8deefe6796662b250e2aee4581e7b9b1e6e727048150fa");
  });

  it("normalizes 0x prefixes and sorts icd10", () => {
    const a = diagnosisVisitCommitmentSync({
      credentialId: "0xAABBCCDD",
      icd10Codes: ["j45", " e11 "],
      issuedAtMs: base.issuedAtMs,
      visitNonceHex: "0x" + base.visitNonceHex
    });
    const b = diagnosisVisitCommitmentSync({
      credentialId: "aabbccdd",
      icd10Codes: ["J45", "E11"],
      issuedAtMs: base.issuedAtMs,
      visitNonceHex: base.visitNonceHex
    });
    expect(a).toBe(b);
  });
});
