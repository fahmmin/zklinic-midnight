import { describe, expect, it } from "vitest";
import { ZK_CLINIC_PUBLIC_CIRCUITS } from "../common-types.js";

/**
 * Mirror of `export circuit` names in `zkclinic/contract/src/zkclinic.compact`.
 * If the contract gains or loses a public circuit, update both `common-types.ts` and this list.
 */
const EXPECTED_PUBLIC_CIRCUITS = [
  "submitIssuerRequest",
  "approveIssuer",
  "revokeIssuer",
  "transferAdmin",
  "registerCredential",
  "appendDiagnosisToCredential",
  "revokeCredential",
  "createTrial",
  "closeTrial",
  "recordEnrollment"
] as const;

describe("ZKClinic public circuit coverage", () => {
  it("matches contract export circuit names", () => {
    expect([...ZK_CLINIC_PUBLIC_CIRCUITS].sort()).toEqual([...EXPECTED_PUBLIC_CIRCUITS].sort());
  });

  it("has no duplicates", () => {
    const set = new Set(ZK_CLINIC_PUBLIC_CIRCUITS);
    expect(set.size).toBe(ZK_CLINIC_PUBLIC_CIRCUITS.length);
  });
});
