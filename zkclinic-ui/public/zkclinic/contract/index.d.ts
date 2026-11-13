import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum IssuerStatus { None = 0, Pending = 1, Approved = 2, Revoked = 3 }

export type IssuerRecord = { doctorKey: { bytes: Uint8Array };
                             licenseHash: Uint8Array;
                             attestationHash: Uint8Array;
                             issuerVerificationHash: Uint8Array;
                             status: IssuerStatus;
                             submittedAt: bigint;
                             approvedAt: bigint;
                             revokedAt: bigint
                           };

export enum TrialStatus { Open = 0, Closed = 1, Full = 2 }

export type TrialRecord = { manager: { bytes: Uint8Array };
                            slotsTotal: bigint;
                            slotsFilled: bigint;
                            deadline: bigint;
                            status: TrialStatus;
                            criteriaHash: Uint8Array;
                            eligibilityThresholdBps: bigint
                          };

export type LabResult = { code: Uint8Array; value: bigint };

export type HealthAttributes = { ageYears: bigint;
                                 diagnoses: Uint8Array[];
                                 labs: LabResult[];
                                 expiresAt: bigint;
                                 salt: Uint8Array
                               };

export type EligibilityCriteria = { minAge: bigint;
                                    maxAge: bigint;
                                    requiredDiagnosis: Uint8Array;
                                    excludedDiagnosis: Uint8Array;
                                    labCode: Uint8Array;
                                    labMin: bigint;
                                    labMax: bigint
                                  };

export type Witnesses<PS> = {
  patientSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  healthAttributes(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, HealthAttributes];
  credentialPath(context: __compactRuntime.WitnessContext<Ledger, PS>,
                 commitment_0: Uint8Array): [PS, { leaf: Uint8Array,
                                                   path: { sibling: { field: bigint
                                                                    },
                                                           goes_left: boolean
                                                         }[]
                                                 }];
  recordApplication(context: __compactRuntime.WitnessContext<Ledger, PS>,
                    trialId_0: Uint8Array,
                    nullifier_0: Uint8Array): [PS, []];
}

export type ImpureCircuits<PS> = {
  submitIssuerRequest(context: __compactRuntime.CircuitContext<PS>,
                      licenseHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  approveIssuer(context: __compactRuntime.CircuitContext<PS>,
                doctor_0: { bytes: Uint8Array },
                attestationHash_0: Uint8Array,
                issuerVerificationHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revokeIssuer(context: __compactRuntime.CircuitContext<PS>,
               doctor_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  transferAdmin(context: __compactRuntime.CircuitContext<PS>,
                newAdmin_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     credentialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  appendDiagnosisToCredential(context: __compactRuntime.CircuitContext<PS>,
                              credentialId_0: Uint8Array,
                              entryCommitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  createTrial(context: __compactRuntime.CircuitContext<PS>,
              trialId_0: Uint8Array,
              slotsTotal_0: bigint,
              deadline_0: bigint,
              criteriaHash_0: Uint8Array,
              eligibilityThresholdBps_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  closeTrial(context: __compactRuntime.CircuitContext<PS>, trialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issueCredentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                            commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishTrialCriteria(context: __compactRuntime.CircuitContext<PS>,
                       trialId_0: Uint8Array,
                       criteria_0: EligibilityCriteria): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveEligibility(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array,
                   asOf_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  recordEnrollment(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array,
                   nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  submitIssuerRequest(context: __compactRuntime.CircuitContext<PS>,
                      licenseHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  approveIssuer(context: __compactRuntime.CircuitContext<PS>,
                doctor_0: { bytes: Uint8Array },
                attestationHash_0: Uint8Array,
                issuerVerificationHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revokeIssuer(context: __compactRuntime.CircuitContext<PS>,
               doctor_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  transferAdmin(context: __compactRuntime.CircuitContext<PS>,
                newAdmin_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     credentialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  appendDiagnosisToCredential(context: __compactRuntime.CircuitContext<PS>,
                              credentialId_0: Uint8Array,
                              entryCommitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  createTrial(context: __compactRuntime.CircuitContext<PS>,
              trialId_0: Uint8Array,
              slotsTotal_0: bigint,
              deadline_0: bigint,
              criteriaHash_0: Uint8Array,
              eligibilityThresholdBps_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  closeTrial(context: __compactRuntime.CircuitContext<PS>, trialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  issueCredentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                            commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishTrialCriteria(context: __compactRuntime.CircuitContext<PS>,
                       trialId_0: Uint8Array,
                       criteria_0: EligibilityCriteria): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveEligibility(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array,
                   asOf_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  recordEnrollment(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array,
                   nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
  patientPublicKey(sk_0: Uint8Array): Uint8Array;
  credentialCommitment(ownerPk_0: Uint8Array, attrs_0: HealthAttributes): Uint8Array;
  trialNullifier(trialId_0: Uint8Array, sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  submitIssuerRequest(context: __compactRuntime.CircuitContext<PS>,
                      licenseHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  approveIssuer(context: __compactRuntime.CircuitContext<PS>,
                doctor_0: { bytes: Uint8Array },
                attestationHash_0: Uint8Array,
                issuerVerificationHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revokeIssuer(context: __compactRuntime.CircuitContext<PS>,
               doctor_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  transferAdmin(context: __compactRuntime.CircuitContext<PS>,
                newAdmin_0: { bytes: Uint8Array }): Promise<__compactRuntime.CircuitResults<PS, []>>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     credentialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  appendDiagnosisToCredential(context: __compactRuntime.CircuitContext<PS>,
                              credentialId_0: Uint8Array,
                              entryCommitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  createTrial(context: __compactRuntime.CircuitContext<PS>,
              trialId_0: Uint8Array,
              slotsTotal_0: bigint,
              deadline_0: bigint,
              criteriaHash_0: Uint8Array,
              eligibilityThresholdBps_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  closeTrial(context: __compactRuntime.CircuitContext<PS>, trialId_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  patientPublicKey(context: __compactRuntime.CircuitContext<PS>,
                   sk_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  credentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                       ownerPk_0: Uint8Array,
                       attrs_0: HealthAttributes): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  trialNullifier(context: __compactRuntime.CircuitContext<PS>,
                 trialId_0: Uint8Array,
                 sk_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  issueCredentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                            commitment_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  publishTrialCriteria(context: __compactRuntime.CircuitContext<PS>,
                       trialId_0: Uint8Array,
                       criteria_0: EligibilityCriteria): Promise<__compactRuntime.CircuitResults<PS, []>>;
  proveEligibility(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array,
                   asOf_0: bigint): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  recordEnrollment(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array,
                   nullifier_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
  readonly admin: { bytes: Uint8Array };
  pendingIssuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): Uint8Array;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, Uint8Array]>
  };
  issuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: { bytes: Uint8Array }): boolean;
    lookup(key_0: { bytes: Uint8Array }): IssuerRecord;
    [Symbol.iterator](): Iterator<[{ bytes: Uint8Array }, IssuerRecord]>
  };
  issuedCredentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { bytes: Uint8Array };
    [Symbol.iterator](): Iterator<[Uint8Array, { bytes: Uint8Array }]>
  };
  revokedCredentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  credentialDiagnosisNextIndex: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  diagnosisCommitmentBySlot: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  trials: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): TrialRecord;
    [Symbol.iterator](): Iterator<[Uint8Array, TrialRecord]>
  };
  credentialCommitments: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  readonly credentialCommitmentCount: bigint;
  trialCriteria: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): EligibilityCriteria;
    [Symbol.iterator](): Iterator<[Uint8Array, EligibilityCriteria]>
  };
  eligibilityProofs: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  trialEligibleCount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  enrolledProofs: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
export declare const circuitSignatures: __compactRuntime.CircuitSignatures;
export declare const declaredInterfaces: __compactRuntime.DeclaredInterfaces;
