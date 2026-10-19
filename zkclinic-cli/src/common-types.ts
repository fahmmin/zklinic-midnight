import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import type { DeployedContract, FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import { ZKClinic } from "zkclinic-contract";

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
  "recordEnrollment"
] as const;

export type ZKClinicCircuits = (typeof ZK_CLINIC_PUBLIC_CIRCUITS)[number];

export type ZKClinicPrivateStateId = "zkclinicState";

export type ZKClinicProviders = MidnightProviders<ZKClinicCircuits, ZKClinicPrivateStateId, undefined>;

export type ZKClinicContract = ZKClinic.Contract<undefined>;

export type DeployedZKClinicContract = DeployedContract<ZKClinicContract> | FoundContract<ZKClinicContract>;

