import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { HealthAttributes, Ledger, Witnesses } from "./managed/zkclinic/contract/index.js";

/**
 * Everything here stays on the patient's device. Doctors, admins and trial managers run with
 * `attributes: null` — their circuits never call a witness.
 */
export type ZKClinicPrivateState = {
  readonly secretKey: Uint8Array;
  readonly attributes: HealthAttributes | null;
  readonly applications: readonly { trialId: Uint8Array; nullifier: Uint8Array }[];
};

export const createZKClinicPrivateState = (
  secretKey: Uint8Array,
  attributes: HealthAttributes | null = null
): ZKClinicPrivateState => ({ secretKey, attributes, applications: [] });

type Ctx = WitnessContext<Ledger, ZKClinicPrivateState>;

export const witnesses: Witnesses<ZKClinicPrivateState> = {
  patientSecretKey: ({ privateState }: Ctx) => [privateState, privateState.secretKey],

  healthAttributes: ({ privateState }: Ctx) => {
    if (!privateState.attributes) throw new Error("No health credential in private state");
    return [privateState, privateState.attributes];
  },

  credentialPath: ({ privateState, ledger }: Ctx, commitment: Uint8Array) => {
    const path = ledger.credentialCommitments.findPathForLeaf(commitment);
    if (!path) throw new Error("Credential commitment not found on-chain (not attested by a doctor yet?)");
    return [privateState, path];
  },

  recordApplication: ({ privateState }: Ctx, trialId: Uint8Array, nullifier: Uint8Array) => [
    { ...privateState, applications: [...privateState.applications, { trialId, nullifier }] },
    []
  ]
};
