import { describe, expect, it } from "vitest";
import {
  attributesFromCredential,
  attributesFromJson,
  attributesToJson,
  codeBytes,
  criteriaFromTrial
} from "../eligibility.js";
import { actor, bytes32, ZKClinicSimulator } from "../simulator.js";

const NOW = 1_800_000_000;
const credential = {
  ageYears: 52,
  icd10Codes: ["e11.9", "I10"],
  labResults: [
    { testName: "eGFR", value: 74 },
    { testName: "HbA1c", value: 8.2 }
  ],
  expiresAt: (NOW + 86_400 * 300) * 1000
};
const trial = {
  ageMin: 18,
  ageMax: 65,
  inclusionIcd10: ["E11.9"],
  exclusionIcd10: ["O24.4"],
  labCriteria: [{ testName: "hba1c", operator: ">=" as const, threshold: 7.5 }]
};

describe("app JSON -> circuit structs", () => {
  it("normalizes codes so doctor and trial manager agree byte-for-byte", async () => {
    expect(codeBytes(" e11.9 ")).toEqual(codeBytes("E11.9"));
    expect(codeBytes("HbA1c")).toEqual(codeBytes("hba1c"));
    expect(codeBytes("E11.9").length).toBe(32);
  });

  it.each([
    [">=", 7.5, 750n, 4294967295n],
    [">", 7.5, 751n, 4294967295n],
    ["<=", 7.5, 0n, 750n],
    ["<", 7.5, 0n, 749n],
    ["=", 7.5, 750n, 750n]
  ] as const)("lab operator %s %d -> [%d, %d]", (operator, threshold, min, max) => {
    const c = criteriaFromTrial({ ...trial, labCriteria: [{ testName: "HbA1c", operator, threshold }] });
    expect([c.labMin, c.labMax]).toEqual([min, max]);
  });

  it("rejects trials the circuit could never check", async () => {
    expect(() => criteriaFromTrial({ inclusionIcd10: [] })).toThrow("at least one inclusion diagnosis");
    expect(() => criteriaFromTrial({ ...trial, labCriteria: [{ testName: "x", operator: "<", threshold: 0 }] })).toThrow("can never match");
  });

  it("attributes survive the JSON round trip used inside the encrypted credential", async () => {
    const a = attributesFromCredential(credential, bytes32(9));
    expect(attributesFromJson(JSON.parse(JSON.stringify(attributesToJson(a))))).toEqual(a);
  });

  it("end to end: real-shaped credential + trial JSON pass the compiled circuit", async () => {
    const admin = actor(1);
    const doctor = actor(2);
    const manager = actor(3);
    const patient = actor(4, attributesFromCredential(credential, bytes32(9)));
    const sim = await ZKClinicSimulator.create(admin);
    sim.now = NOW;
    await sim.submitIssuerRequest(doctor, bytes32(42));
    await sim.approveIssuer(admin, doctor);
    await sim.createTrial(manager, bytes32(1), 5n);
    await sim.publishTrialCriteria(manager, bytes32(1), criteriaFromTrial(trial));
    await sim.issueCredentialCommitment(doctor, sim.commitmentFor(patient));
    await expect(sim.proveEligibility(patient, bytes32(1))).resolves.not.toThrow();

    // Same patient, stricter trial (HbA1c > 9): the circuit refuses.
    await sim.createTrial(manager, bytes32(2), 5n);
    await sim.publishTrialCriteria(manager, bytes32(2), criteriaFromTrial({ ...trial, labCriteria: [{ testName: "HbA1c", operator: ">", threshold: 9 }] }));
    await expect(sim.proveEligibility(patient, bytes32(2))).rejects.toThrow("Lab requirement not met");
  });
});
