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

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  submitIssuerRequest(context: __compactRuntime.CircuitContext<PS>,
                      licenseHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveIssuer(context: __compactRuntime.CircuitContext<PS>,
                doctor_0: { bytes: Uint8Array },
                attestationHash_0: Uint8Array,
                issuerVerificationHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeIssuer(context: __compactRuntime.CircuitContext<PS>,
               doctor_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  transferAdmin(context: __compactRuntime.CircuitContext<PS>,
                newAdmin_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  appendDiagnosisToCredential(context: __compactRuntime.CircuitContext<PS>,
                              credentialId_0: Uint8Array,
                              entryCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createTrial(context: __compactRuntime.CircuitContext<PS>,
              trialId_0: Uint8Array,
              slotsTotal_0: bigint,
              deadline_0: bigint,
              criteriaHash_0: Uint8Array,
              eligibilityThresholdBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeTrial(context: __compactRuntime.CircuitContext<PS>, trialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  recordEnrollment(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  submitIssuerRequest(context: __compactRuntime.CircuitContext<PS>,
                      licenseHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  approveIssuer(context: __compactRuntime.CircuitContext<PS>,
                doctor_0: { bytes: Uint8Array },
                attestationHash_0: Uint8Array,
                issuerVerificationHash_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeIssuer(context: __compactRuntime.CircuitContext<PS>,
               doctor_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  transferAdmin(context: __compactRuntime.CircuitContext<PS>,
                newAdmin_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, []>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>,
                     credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  appendDiagnosisToCredential(context: __compactRuntime.CircuitContext<PS>,
                              credentialId_0: Uint8Array,
                              entryCommitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>,
                   credentialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createTrial(context: __compactRuntime.CircuitContext<PS>,
              trialId_0: Uint8Array,
              slotsTotal_0: bigint,
              deadline_0: bigint,
              criteriaHash_0: Uint8Array,
              eligibilityThresholdBps_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  closeTrial(context: __compactRuntime.CircuitContext<PS>, trialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  recordEnrollment(context: __compactRuntime.CircuitContext<PS>,
                   trialId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
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
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
