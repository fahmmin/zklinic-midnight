import { beforeEach, describe, expect, it } from "vitest";
import {
  type EligibilityCriteria,
  type HealthAttributes,
  IssuerStatus,
  pureCircuits,
  TrialStatus
} from "../managed/zkclinic/contract/index.js";
import { type Actor, actor, bytes32, ZKClinicSimulator } from "../simulator.js";

const ZERO = new Uint8Array(32);
const T2_DIABETES = bytes32(0xe1); // stands in for sha256("E11.9")
const HYPERTENSION = bytes32(0x10);
const PREGNANCY = bytes32(0x0f);
const HBA1C = bytes32(0xa1);
const TRIAL = bytes32(1);
const TRIAL_2 = bytes32(2);

const NOW = 1_800_000_000;
const NO_LAB = { code: ZERO, value: 0n };
const lab = (value: bigint, code = HBA1C) => ({ code, value });
const labs = (value: bigint, code = HBA1C) => ({ labs: [NO_LAB, lab(value, code), NO_LAB, NO_LAB] });

const attrs = (over: Partial<HealthAttributes> = {}): HealthAttributes => ({
  ageYears: 45n,
  diagnoses: [T2_DIABETES, HYPERTENSION, ZERO, ZERO],
  labs: [lab(820n), NO_LAB, NO_LAB, NO_LAB], // HbA1c 8.20 %
  expiresAt: BigInt(NOW + 86_400 * 365),
  salt: bytes32(0x55),
  ...over
});

const criteria = (over: Partial<EligibilityCriteria> = {}): EligibilityCriteria => ({
  minAge: 18n,
  maxAge: 65n,
  requiredDiagnosis: T2_DIABETES,
  excludedDiagnosis: PREGNANCY,
  labCode: HBA1C,
  labMin: 700n,
  labMax: 1000n,
  ...over
});

let admin: Actor, doctor: Actor, manager: Actor, patient: Actor, sim: ZKClinicSimulator;

/** Approved doctor + open trial with published criteria + attested patient. */
const setup = async (patientAttrs = attrs(), trialCriteria = criteria()) => {
  admin = actor(1);
  doctor = actor(2);
  manager = actor(3);
  patient = actor(4, patientAttrs);
  sim = await ZKClinicSimulator.create(admin);
  await sim.submitIssuerRequest(doctor, bytes32(42));
  await sim.approveIssuer(admin, doctor);
  await sim.createTrial(manager, TRIAL, 2n);
  await sim.publishTrialCriteria(manager, TRIAL, trialCriteria);
  await sim.issueCredentialCommitment(doctor, sim.commitmentFor(patient));
};

describe("issuer registry", () => {
  beforeEach(async () => {
    admin = actor(1);
    doctor = actor(2);
    sim = await ZKClinicSimulator.create(admin);
  });

  it("stores a pending license hash, then admin approves", async () => {
    await sim.submitIssuerRequest(doctor, bytes32(42));
    expect(sim.ledger.pendingIssuers.lookup(doctor.key)).toEqual(bytes32(42));
    await sim.approveIssuer(admin, doctor);
    expect(sim.ledger.pendingIssuers.member(doctor.key)).toBe(false);
    expect(sim.ledger.issuers.lookup(doctor.key).status).toBe(IssuerStatus.Approved);
  });

  it("rejects duplicate requests and non-admin approval", async () => {
    await sim.submitIssuerRequest(doctor, bytes32(42));
    await expect(sim.submitIssuerRequest(doctor, bytes32(42))).rejects.toThrow("Issuer request already pending");
    await expect(sim.approveIssuer(doctor, doctor)).rejects.toThrow("Only admin can approve issuer");
  });

  it("revoked issuers can no longer attest credentials", async () => {
    await sim.submitIssuerRequest(doctor, bytes32(42));
    await sim.approveIssuer(admin, doctor);
    await sim.revokeIssuer(admin, doctor);
    expect(sim.ledger.issuers.lookup(doctor.key).status).toBe(IssuerStatus.Revoked);
    await expect(sim.issueCredentialCommitment(doctor, bytes32(5))).rejects.toThrow("Issuer must be approved");
    await expect(sim.registerCredential(doctor, bytes32(5))).rejects.toThrow("Issuer must be approved");
  });

  it("transfers the admin role", async () => {
    const next = actor(9);
    await expect(sim.transferAdmin(doctor, next)).rejects.toThrow("Only admin can transfer admin role");
    await sim.transferAdmin(admin, next);
    await sim.submitIssuerRequest(doctor, bytes32(42));
    await expect(sim.approveIssuer(admin, doctor)).rejects.toThrow("Only admin can approve issuer");
    await sim.approveIssuer(next, doctor);
  });
});

describe("credential registry (credential ids, diagnosis commitments, revocation)", () => {
  beforeEach(async () => await setup());

  it("registers, appends diagnosis commitments in order, and revokes", async () => {
    const id = bytes32(77);
    await sim.registerCredential(doctor, id);
    await expect(sim.registerCredential(doctor, id)).rejects.toThrow("Credential already registered");
    await sim.appendDiagnosis(doctor, id, bytes32(1));
    await sim.appendDiagnosis(doctor, id, bytes32(2));
    expect(sim.ledger.credentialDiagnosisNextIndex.lookup(id)).toBe(2n);
    await sim.revokeCredential(doctor, id);
    expect(sim.ledger.revokedCredentials.member(id)).toBe(true);
    await expect(sim.appendDiagnosis(doctor, id, bytes32(3))).rejects.toThrow("Credential revoked");
  });

  it("only the issuing doctor can touch a credential", async () => {
    const other = actor(8);
    await sim.submitIssuerRequest(other, bytes32(43));
    await sim.approveIssuer(admin, other);
    await sim.registerCredential(doctor, bytes32(77));
    await expect(sim.revokeCredential(other, bytes32(77))).rejects.toThrow("Only the issuing doctor can revoke");
    await expect(sim.appendDiagnosis(other, bytes32(77), bytes32(1))).rejects.toThrow("Only the issuing doctor can append");
    await expect(sim.registerCredential(patient, bytes32(78))).rejects.toThrow("Caller is not a registered issuer");
  });
});

describe("trial registry", () => {
  beforeEach(async () => await setup());

  it("creates an open trial and validates inputs", async () => {
    expect(sim.ledger.trials.lookup(TRIAL)).toMatchObject({ slotsTotal: 2n, slotsFilled: 0n, status: TrialStatus.Open });
    await expect(sim.createTrial(manager, TRIAL, 2n)).rejects.toThrow("Trial id already exists");
    await expect(sim.createTrial(manager, TRIAL_2, 0n)).rejects.toThrow("Slots must be positive");
    await expect(sim.createTrial(manager, TRIAL_2, 1n, 10001n)).rejects.toThrow("Threshold cannot exceed 100%");
  });

  it("criteria are manager-only, validated, and immutable once published", async () => {
    await expect(sim.publishTrialCriteria(manager, TRIAL, criteria({ maxAge: 99n }))).rejects.toThrow("Criteria already published");
    await sim.createTrial(manager, TRIAL_2, 1n);
    await expect(sim.publishTrialCriteria(doctor, TRIAL_2, criteria())).rejects.toThrow("Only trial manager can publish criteria");
    await expect(sim.publishTrialCriteria(manager, TRIAL_2, criteria({ minAge: 70n }))).rejects.toThrow("minAge cannot exceed maxAge");
    await expect(sim.publishTrialCriteria(manager, TRIAL_2, criteria({ requiredDiagnosis: ZERO }))).rejects.toThrow("Required diagnosis missing");
  });

  it("only the manager can close; closed trials reject proofs", async () => {
    await expect(sim.closeTrial(doctor, TRIAL)).rejects.toThrow("Only trial manager can close");
    await sim.closeTrial(manager, TRIAL);
    expect(sim.ledger.trials.lookup(TRIAL).status).toBe(TrialStatus.Closed);
    await expect(sim.proveEligibility(patient, TRIAL)).rejects.toThrow("Trial not open");
  });
});

describe("private eligibility proof", () => {
  it("eligible patient gets a per-trial pseudonym; private state remembers the application", async () => {
    await setup();
    const nul = await sim.proveEligibility(patient, TRIAL);
    expect(nul).toEqual(pureCircuits.trialNullifier(TRIAL, patient.privateState.secretKey));
    expect(sim.ledger.eligibilityProofs.lookup(nul)).toEqual(TRIAL);
    expect(sim.ledger.trialEligibleCount.lookup(TRIAL)).toBe(1n);
    expect(patient.privateState.applications).toEqual([{ trialId: TRIAL, nullifier: nul }]);
  });

  it("cannot prove twice for one trial, and pseudonyms are unlinkable across trials", async () => {
    await setup();
    const first = await sim.proveEligibility(patient, TRIAL);
    await expect(sim.proveEligibility(patient, TRIAL)).rejects.toThrow("Already proven for this trial");
    await sim.createTrial(manager, TRIAL_2, 1n);
    await sim.publishTrialCriteria(manager, TRIAL_2, criteria());
    expect(await sim.proveEligibility(patient, TRIAL_2)).not.toEqual(first);
  });

  it.each<[string, Partial<HealthAttributes>, string]>([
    ["too young", { ageYears: 17n }, "Age outside trial range"],
    ["too old", { ageYears: 66n }, "Age outside trial range"],
    ["required diagnosis absent", { diagnoses: [HYPERTENSION, ZERO, ZERO, ZERO] }, "Required diagnosis not present"],
    ["excluded diagnosis present", { diagnoses: [T2_DIABETES, PREGNANCY, ZERO, ZERO] }, "Excluded diagnosis present"],
    ["lab below range", labs(699n), "Lab requirement not met"],
    ["lab above range", labs(1001n), "Lab requirement not met"],
    ["different lab test", labs(820n, bytes32(0xb2)), "Lab requirement not met"],
    ["expired credential", { expiresAt: BigInt(NOW - 1) }, "Credential expired"]
  ])("rejects: %s", async (_name, over, message) => {
    await setup(attrs(over));
    await expect(sim.proveEligibility(patient, TRIAL)).rejects.toThrow(message);
    expect(sim.ledger.eligibilityProofs.isEmpty()).toBe(true);
  });

  it("boundary values pass (inclusive ranges)", async () => {
    await setup(attrs({ ageYears: 18n, ...labs(700n) }));
    await expect(sim.proveEligibility(patient, TRIAL)).resolves.not.toThrow();
  });

  it("zero-valued optional rules are skipped", async () => {
    await setup(attrs({ labs: [NO_LAB, NO_LAB, NO_LAB, NO_LAB] }), criteria({ excludedDiagnosis: ZERO, labCode: ZERO, labMin: 0n, labMax: 0n }));
    await expect(sim.proveEligibility(patient, TRIAL)).resolves.not.toThrow();
  });

  it("rejects a stale asOf timestamp", async () => {
    await setup();
    await expect(sim.proveEligibility(patient, TRIAL, BigInt(NOW - 10))).rejects.toThrow("asOf is in the past");
  });

  it("rejects a credential no doctor attested", async () => {
    await setup();
    const stranger = actor(5, attrs());
    await expect(sim.proveEligibility(stranger, TRIAL)).rejects.toThrow("Credential commitment not found on-chain");
  });

  it("rejects attributes edited after attestation", async () => {
    await setup(attrs({ ageYears: 80n }));
    patient.privateState = { ...patient.privateState, attributes: attrs({ ageYears: 45n }) };
    await expect(sim.proveEligibility(patient, TRIAL)).rejects.toThrow("Credential commitment not found on-chain");
  });

  it("rejects a forged Merkle path (someone else's leaf)", async () => {
    await setup();
    const thief = actor(6, attrs());
    const stolenPath = sim.ledger.credentialCommitments.findPathForLeaf(sim.commitmentFor(patient))!;
    const contract = sim.contract;
    const original = contract.witnesses.credentialPath;
    contract.witnesses.credentialPath = ({ privateState }) => [privateState, stolenPath];
    try {
      await expect(sim.proveEligibility(thief, TRIAL)).rejects.toThrow("Merkle path is not for this credential");
    } finally {
      contract.witnesses.credentialPath = original;
    }
  });

  it("rejects trials without on-chain criteria", async () => {
    await setup();
    await sim.createTrial(manager, TRIAL_2, 1n);
    await expect(sim.proveEligibility(patient, TRIAL_2)).rejects.toThrow("Trial has no on-chain criteria");
    await expect(sim.proveEligibility(patient, bytes32(99))).rejects.toThrow("Trial not found");
  });

  it("an old Merkle root stays valid after more credentials are attested", async () => {
    await setup();
    await sim.issueCredentialCommitment(doctor, bytes32(123));
    await sim.issueCredentialCommitment(doctor, bytes32(124));
    expect(sim.ledger.credentialCommitmentCount).toBe(3n);
    await expect(sim.proveEligibility(patient, TRIAL)).resolves.not.toThrow();
  });
});

describe("proof-bound enrollment", () => {
  beforeEach(async () => await setup());

  it("enrolls only pseudonyms that proved eligibility for this trial", async () => {
    await expect(sim.recordEnrollment(manager, TRIAL, bytes32(66))).rejects.toThrow("No eligibility proof for this pseudonym");
    const nul = await sim.proveEligibility(patient, TRIAL);
    await expect(sim.recordEnrollment(doctor, TRIAL, nul)).rejects.toThrow("Only trial manager can record enrollment");
    await sim.recordEnrollment(manager, TRIAL, nul);
    expect(sim.ledger.trials.lookup(TRIAL).slotsFilled).toBe(1n);
    await expect(sim.recordEnrollment(manager, TRIAL, nul)).rejects.toThrow("Pseudonym already enrolled");
  });

  it("a proof for one trial cannot be replayed into another", async () => {
    const nul = await sim.proveEligibility(patient, TRIAL);
    await sim.createTrial(manager, TRIAL_2, 1n);
    await expect(sim.recordEnrollment(manager, TRIAL_2, nul)).rejects.toThrow("Proof is bound to a different trial");
  });

  it("marks the trial Full on the last slot and blocks over-enrollment", async () => {
    const second = actor(7, attrs({ salt: bytes32(0x66) }));
    const third = actor(10, attrs({ salt: bytes32(0x67) }));
    await sim.issueCredentialCommitment(doctor, sim.commitmentFor(second));
    await sim.issueCredentialCommitment(doctor, sim.commitmentFor(third));
    const nuls: Uint8Array[] = [];
    for (const p of [patient, second, third]) nuls.push(await sim.proveEligibility(p, TRIAL));
    await sim.recordEnrollment(manager, TRIAL, nuls[0]);
    await sim.recordEnrollment(manager, TRIAL, nuls[1]);
    expect(sim.ledger.trials.lookup(TRIAL)).toMatchObject({ slotsFilled: 2n, status: TrialStatus.Full });
    await expect(sim.recordEnrollment(manager, TRIAL, nuls[2])).rejects.toThrow("Trial not open");
  });
});

describe("privacy: what the public ledger learns", () => {
  it("public state contains no clinical attribute, secret key, or patient public key", async () => {
    await setup();
    const nul = await sim.proveEligibility(patient, TRIAL);
    await sim.recordEnrollment(manager, TRIAL, nul);
    const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
    const publicState = sim.publicStateText();
    const a = patient.privateState.attributes!;
    expect(publicState).toContain(hex(nul)); // sanity: the search works
    for (const secret of [
      patient.privateState.secretKey,
      pureCircuits.patientPublicKey(patient.privateState.secretKey),
      a.salt,
      HYPERTENSION // a diagnosis the trial never asked about
    ]) {
      expect(publicState).not.toContain(hex(secret));
    }
  });
});
