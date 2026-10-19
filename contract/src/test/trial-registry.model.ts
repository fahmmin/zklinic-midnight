export type TrialStatus = "open" | "closed" | "full";

export type TrialRecord = {
  manager: string;
  slotsTotal: number;
  slotsFilled: number;
  deadline: number;
  status: TrialStatus;
  criteriaHash: string;
};

export class TrialRegistryModel {
  private readonly trials = new Map<string, TrialRecord>();

  createTrial(
    manager: string,
    trialId: string,
    slotsTotal: number,
    deadline: number,
    criteriaHash: string
  ): void {
    if (this.trials.has(trialId)) {
      throw new Error("Trial already exists");
    }
    if (slotsTotal <= 0) {
      throw new Error("Slots must be positive");
    }
    this.trials.set(trialId, {
      manager,
      slotsTotal,
      slotsFilled: 0,
      deadline,
      status: "open",
      criteriaHash
    });
  }

  closeTrial(caller: string, trialId: string): void {
    const trial = this.requireTrial(trialId);
    if (trial.manager !== caller) {
      throw new Error("Only trial manager can close");
    }
    trial.status = "closed";
  }

  recordEnrollment(caller: string, trialId: string): void {
    const trial = this.requireTrial(trialId);
    if (trial.manager !== caller) {
      throw new Error("Only trial manager can record enrollment");
    }
    if (trial.status !== "open") {
      throw new Error("Trial is not open");
    }
    if (trial.slotsFilled >= trial.slotsTotal) {
      throw new Error("No slots left");
    }
    trial.slotsFilled += 1;
    if (trial.slotsFilled === trial.slotsTotal) {
      trial.status = "full";
    }
  }

  getTrial(trialId: string): TrialRecord | undefined {
    return this.trials.get(trialId);
  }

  private requireTrial(trialId: string): TrialRecord {
    const trial = this.trials.get(trialId);
    if (!trial) {
      throw new Error("Trial not found");
    }
    return trial;
  }
}
