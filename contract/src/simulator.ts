import {
  type CircuitContext,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type EligibilityCriteria,
  type HealthAttributes,
  ledger,
  pureCircuits
} from "./managed/zkclinic/contract/index.js";
import { createZKClinicPrivateState, witnesses, type ZKClinicPrivateState } from "./witnesses.js";

export const bytes32 = (n: number): Uint8Array => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};
const coinKey = (n: number): string => n.toString(16).padStart(64, "0");
const zswapKey = (n: number) => ({ bytes: bytes32(n) });

export type Actor = { coin: string; key: { bytes: Uint8Array }; privateState: ZKClinicPrivateState };

/** Each actor has their own wallet key AND their own private state — like separate devices. */
export const actor = (n: number, attributes: HealthAttributes | null = null): Actor => ({
  coin: coinKey(n),
  key: zswapKey(n),
  privateState: createZKClinicPrivateState(bytes32(100 + n), attributes)
});

/**
 * Runs the compiled contract's real circuit logic (same code the proof server proves) against an
 * in-memory ledger. One shared public state, one private state per actor.
 */
export class ZKClinicSimulator {
  readonly contract = new Contract<ZKClinicPrivateState>(witnesses);
  readonly address = sampleContractAddress();
  private state!: CircuitContext<ZKClinicPrivateState>["callContext"]["currentQueryContext"]["state"];
  /** Block time in unix seconds. */
  now = 1_800_000_000;

  private constructor(readonly admin: Actor) {}

  /** Circuits are async since compact-runtime 0.21, so construction is too. */
  static async create(admin: Actor): Promise<ZKClinicSimulator> {
    const sim = new ZKClinicSimulator(admin);
    const init = await sim.contract.initialState(createConstructorContext(admin.privateState, admin.coin));
    sim.state = init.currentContractState.data;
    return sim;
  }

  get ledger() {
    return ledger(this.state);
  }

  /** Debug rendering of the entire public contract state (hex cells). */
  publicStateText(): string {
    return this.state.toString(false);
  }

  /** Run a circuit as `who`; on success commit the public state and that actor's private state. */
  private async run<R>(
    who: Actor,
    circuitId: string,
    f: (ctx: CircuitContext<ZKClinicPrivateState>) => Promise<{ result: R; context: CircuitContext<ZKClinicPrivateState> }>
  ): Promise<R> {
    const ctx = createCircuitContext({
      circuitId,
      contractAddress: this.address,
      coinPublicKeyOrZswapState: who.coin,
      contractState: this.state,
      privateState: who.privateState,
      time: this.now
    });
    const { result, context } = await f(ctx);
    this.state = context.callContext.currentQueryContext.state;
    who.privateState = context.callContext.currentPrivateState as ZKClinicPrivateState;
    return result;
  }

  private get c() {
    return this.contract.impureCircuits;
  }

  submitIssuerRequest = (who: Actor, licenseHash: Uint8Array) => this.run(who, "submitIssuerRequest", (x) => this.c.submitIssuerRequest(x, licenseHash));
  approveIssuer = (who: Actor, doctor: Actor) => this.run(who, "approveIssuer", (x) => this.c.approveIssuer(x, doctor.key, bytes32(7), bytes32(8)));
  revokeIssuer = (who: Actor, doctor: Actor) => this.run(who, "revokeIssuer", (x) => this.c.revokeIssuer(x, doctor.key));
  transferAdmin = (who: Actor, next: Actor) => this.run(who, "transferAdmin", (x) => this.c.transferAdmin(x, next.key));
  registerCredential = (who: Actor, id: Uint8Array) => this.run(who, "registerCredential", (x) => this.c.registerCredential(x, id));
  appendDiagnosis = (who: Actor, id: Uint8Array, entry: Uint8Array) => this.run(who, "appendDiagnosisToCredential", (x) => this.c.appendDiagnosisToCredential(x, id, entry));
  revokeCredential = (who: Actor, id: Uint8Array) => this.run(who, "revokeCredential", (x) => this.c.revokeCredential(x, id));
  createTrial = (who: Actor, trialId: Uint8Array, slots: bigint, thresholdBps = 7500n) =>
    this.run(who, "createTrial", (x) => this.c.createTrial(x, trialId, slots, 1_900_000_000_000n, bytes32(9), thresholdBps));
  closeTrial = (who: Actor, trialId: Uint8Array) => this.run(who, "closeTrial", (x) => this.c.closeTrial(x, trialId));
  publishTrialCriteria = (who: Actor, trialId: Uint8Array, criteria: EligibilityCriteria) =>
    this.run(who, "publishTrialCriteria", (x) => this.c.publishTrialCriteria(x, trialId, criteria));
  issueCredentialCommitment = (who: Actor, commitment: Uint8Array) =>
    this.run(who, "issueCredentialCommitment", (x) => this.c.issueCredentialCommitment(x, commitment));
  proveEligibility = (who: Actor, trialId: Uint8Array, asOf = BigInt(this.now + 300)) =>
    this.run(who, "proveEligibility", (x) => this.c.proveEligibility(x, trialId, asOf));
  recordEnrollment = (who: Actor, trialId: Uint8Array, nullifier: Uint8Array) =>
    this.run(who, "recordEnrollment", (x) => this.c.recordEnrollment(x, trialId, nullifier));

  /** What the doctor computes off-chain from the patient's public key + attested attributes. */
  commitmentFor(patient: Actor): Uint8Array {
    if (!patient.privateState.attributes) throw new Error("patient has no attributes");
    return pureCircuits.credentialCommitment(
      pureCircuits.patientPublicKey(patient.privateState.secretKey),
      patient.privateState.attributes
    );
  }
}
