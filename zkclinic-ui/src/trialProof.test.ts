import { describe, expect, it } from "vitest";
import { evaluateTrialEligibility, diagnosisCategoryForCode, trialDiagnosisCategories } from "./trialProof";
import type { HealthCredentialPayload } from "./credential";
import type { TrialCriteriaV1 } from "./trialCriteria";

function makeCredential(overrides: Partial<HealthCredentialPayload> = {}): HealthCredentialPayload {
  return {
    credentialId: "aa".repeat(32),
    doctorPubKeyHex: "bb".repeat(32),
    icd10Codes: ["E11.9"],
    medications: ["metformin"],
    labResults: [{ testName: "HbA1c", value: 8.1, unit: "%" }],
    issuedAt: 1_700_000_000_000,
    expiresAt: 1_800_000_000_000,
    ...overrides
  };
}

function makeCriteria(overrides: Partial<TrialCriteriaV1> = {}): TrialCriteriaV1 {
  return {
    version: 1,
    trialId: "cc".repeat(32),
    title: "Diabetes",
    inclusionIcd10: ["E11.9"],
    exclusionIcd10: ["I10"],
    exclusionMedications: ["warfarin"],
    ageMin: 18,
    ageMax: 75,
    labCriteria: [{ testName: "HbA1c", operator: ">=", threshold: 7.5, unit: "%" }],
    ...overrides
  };
}

describe("trial proof evaluation", () => {
  it("marks a fully matching credential as eligible", () => {
    const evaluation = evaluateTrialEligibility(
      makeCriteria(),
      makeCredential({ ageYears: 42 })
    );

    expect(evaluation.eligible).toBe(true);
    expect(evaluation.matchPercent).toBe(100);
    expect(evaluation.thresholdPercent).toBe(75);
    expect(evaluation.blockedByExclusion).toBe(false);
    expect(evaluation.criterionResults.every((criterion) => criterion.passed)).toBe(true);
  });

  it("fails when the credential contains an exclusion or misses required data", () => {
    const evaluation = evaluateTrialEligibility(
      makeCriteria(),
      makeCredential({
        icd10Codes: ["E11.9", "I10"],
        medications: ["warfarin"],
        ageYears: undefined,
        labResults: []
      })
    );

    expect(evaluation.eligible).toBe(false);
    expect(evaluation.blockedByExclusion).toBe(true);
    expect(evaluation.criterionResults.filter((criterion) => !criterion.passed)).toHaveLength(4);
  });

  it("scores non-exclusion criteria only; 2/3 passing is below default 75%", () => {
    const evaluation = evaluateTrialEligibility(
      makeCriteria({}),
      makeCredential({
        ageYears: undefined,
        labResults: [{ testName: "HbA1c", value: 8.1, unit: "%" }]
      })
    );
    expect(evaluation.criterionResults.length).toBeGreaterThanOrEqual(3);
    expect(evaluation.matchPercent).toBe(67);
    expect(evaluation.eligible).toBe(false);
  });

  it("marks eligible when match meets a lowered threshold", () => {
    const evaluation = evaluateTrialEligibility(
      makeCriteria({ eligibilityThresholdPercent: 66 }),
      makeCredential({
        ageYears: undefined,
        labResults: [{ testName: "HbA1c", value: 8.1, unit: "%" }]
      })
    );
    expect(evaluation.matchPercent).toBe(67);
    expect(evaluation.eligible).toBe(true);
  });

  it("derives useful diagnosis categories for browse filters", () => {
    expect(diagnosisCategoryForCode("E11.9")).toBe("Endocrine");
    expect(
      trialDiagnosisCategories(
        makeCriteria({ inclusionIcd10: ["E11.9", "I10", "J45.20"] })
      )
    ).toEqual(["Cardiovascular", "Endocrine", "Respiratory"]);
  });

  it("counts ICD-10 from patient intake conditions toward inclusion", () => {
    const evaluation = evaluateTrialEligibility(
      makeCriteria({ inclusionIcd10: ["E11.9"] }),
      makeCredential({
        icd10Codes: [],
        patientIntake: {
          conditions: [{ label: "T2DM", icd10: "E11.9" }]
        },
        ageYears: 42
      })
    );
    const inc = evaluation.criterionResults.find((c) => c.key === "inclusion-diagnosis");
    expect(inc?.passed).toBe(true);
  });
});
