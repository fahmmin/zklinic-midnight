export type IssuerStatus = "none" | "pending" | "approved" | "revoked";

export type IssuerRecord = {
  doctorKey: string;
  licenseHash: string;
  status: IssuerStatus;
};

export class IssuerRegistryModel {
  readonly admin: string;
  private readonly pending = new Map<string, string>();
  private readonly issuers = new Map<string, IssuerRecord>();

  constructor(admin: string) {
    this.admin = admin;
  }

  submitIssuerRequest(caller: string, licenseHash: string): void {
    if (this.pending.has(caller)) {
      throw new Error("Issuer request already pending");
    }

    const existing = this.issuers.get(caller);
    if (existing?.status === "approved") {
      throw new Error("Issuer already approved");
    }

    this.pending.set(caller, licenseHash);
  }

  approveIssuer(caller: string, doctor: string): void {
    if (caller !== this.admin) {
      throw new Error("Only admin can approve issuer");
    }

    const hash = this.pending.get(doctor);
    if (!hash) {
      throw new Error("Issuer request not found");
    }

    this.issuers.set(doctor, {
      doctorKey: doctor,
      licenseHash: hash,
      status: "approved"
    });
    this.pending.delete(doctor);
  }

  revokeIssuer(caller: string, doctor: string): void {
    if (caller !== this.admin) {
      throw new Error("Only admin can revoke issuer");
    }

    const current = this.issuers.get(doctor);
    if (!current) {
      throw new Error("Issuer not found");
    }

    this.issuers.set(doctor, { ...current, status: "revoked" });
  }

  getPending(doctor: string): string | undefined {
    return this.pending.get(doctor);
  }

  getIssuer(doctor: string): IssuerRecord | undefined {
    return this.issuers.get(doctor);
  }
}
