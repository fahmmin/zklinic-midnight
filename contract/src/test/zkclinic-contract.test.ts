import { describe, expect, it } from "vitest";
import { IssuerRegistryModel } from "./issuer-registry.model.js";
import { TrialRegistryModel } from "./trial-registry.model.js";

describe("zkclinic issuer registry lifecycle", () => {
  it("submits doctor request and stores pending license hash", () => {
    const model = new IssuerRegistryModel("admin");
    model.submitIssuerRequest("doctorA", "0xlicensehash");
    expect(model.getPending("doctorA")).toBe("0xlicensehash");
  });

  it("allows admin to approve a pending issuer", () => {
    const model = new IssuerRegistryModel("admin");
    model.submitIssuerRequest("doctorA", "0xlicensehash");
    model.approveIssuer("admin", "doctorA");

    expect(model.getPending("doctorA")).toBeUndefined();
    expect(model.getIssuer("doctorA")?.status).toBe("approved");
  });

  it("blocks non-admin issuer approval", () => {
    const model = new IssuerRegistryModel("admin");
    model.submitIssuerRequest("doctorA", "0xlicensehash");
    expect(() => model.approveIssuer("doctorA", "doctorA")).toThrow("Only admin can approve issuer");
  });

  it("allows admin to revoke approved issuer", () => {
    const model = new IssuerRegistryModel("admin");
    model.submitIssuerRequest("doctorA", "0xlicensehash");
    model.approveIssuer("admin", "doctorA");
    model.revokeIssuer("admin", "doctorA");
    expect(model.getIssuer("doctorA")?.status).toBe("revoked");
  });
});

describe("zkclinic trial registry lifecycle", () => {
  it("creates a trial with open slots and criteria hash", () => {
    const model = new TrialRegistryModel();
    model.createTrial("managerA", "trial-1", 3, 1_800_000_000_000, "0xcriteria");

    expect(model.getTrial("trial-1")).toMatchObject({
      manager: "managerA",
      slotsTotal: 3,
      slotsFilled: 0,
      status: "open",
      criteriaHash: "0xcriteria"
    });
  });

  it("auto-marks a trial as full on the final enrollment", () => {
    const model = new TrialRegistryModel();
    model.createTrial("managerA", "trial-1", 2, 1_800_000_000_000, "0xcriteria");

    model.recordEnrollment("managerA", "trial-1");
    model.recordEnrollment("managerA", "trial-1");

    expect(model.getTrial("trial-1")).toMatchObject({
      slotsFilled: 2,
      status: "full"
    });
  });

  it("blocks non-managers from changing trial state", () => {
    const model = new TrialRegistryModel();
    model.createTrial("managerA", "trial-1", 2, 1_800_000_000_000, "0xcriteria");

    expect(() => model.closeTrial("managerB", "trial-1")).toThrow("Only trial manager can close");
    expect(() => model.recordEnrollment("managerB", "trial-1")).toThrow(
      "Only trial manager can record enrollment"
    );
  });
});
