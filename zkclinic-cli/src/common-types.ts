import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import type { DeployedContract, FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import { ZKClinic, type ZKClinicPrivateState } from "zkclinic-contract";

/** Public `export circuit` names in `contract/src/zkclinic.compact` (keep in sync). */
export const ZK_CLINIC_PUBLIC_CIRCUITS = [
  "submitIssuerRequest",
  "approveIssuer",
  "revokeIssuer",
  "transferAdmin",
  "registerCredential",
  "appendDiagnosisToCredential",
  "revokeCredential",
  "createTrial",
  "closeTrial",
  "issueCredentialCommitment",
  "publishTrialCriteria",
  "proveEligibility",
  "recordEnrollment"
] as const;

export type ZKClinicCircuits = (typeof ZK_CLINIC_PUBLIC_CIRCUITS)[number];

export type ZKClinicPrivateStateId = "zkclinicState";

export type ZKClinicProviders = MidnightProviders<ZKClinicCircuits, ZKClinicPrivateStateId, ZKClinicPrivateState>;

export type ZKClinicContract = ZKClinic.Contract<ZKClinicPrivateState>;

export type DeployedZKClinicContract = DeployedContract<ZKClinicContract> | FoundContract<ZKClinicContract>;

