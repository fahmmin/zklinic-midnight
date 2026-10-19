import { describe, expect, it } from "vitest";
import { sha256HexUtf8, stableStringify, type TrialCriteriaV1 } from "../src/server.js";

function makeTrialCriteria(trialId: string): TrialCriteriaV1 {
  return {
    version: 1,
    trialId,
    title: "Type 2 diabetes dose-finding study",
    shortDescription: "Adults with T2D and recent HbA1c",
    inclusionIcd10: ["E11.9"],
    exclusionIcd10: ["I10"],
    exclusionMedications: ["warfarin"],
    ageMin: 18,
    ageMax: 75,
    labCriteria: [{ testName: "HbA1c", operator: ">=", threshold: 7.5, unit: "%" }]
  };
}

describe("verification api", () => {
  it("produces a canonical trial metadata hash regardless of object key order", async () => {
    const trialId = "ab".repeat(32);
    const criteria = makeTrialCriteria(trialId);
    const shuffled = {
      ...criteria,
      labCriteria: [...criteria.labCriteria],
      exclusionMedications: [...criteria.exclusionMedications]
    };
    const criteriaHashHex = await sha256HexUtf8(stableStringify(criteria));
    const shuffledHashHex = await sha256HexUtf8(stableStringify(shuffled));
    expect(shuffledHashHex).toBe(criteriaHashHex);
    expect(criteriaHashHex).toHaveLength(64);
  });
});
