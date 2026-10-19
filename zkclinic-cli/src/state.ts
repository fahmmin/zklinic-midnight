export type IssuerStatus = "pending" | "approved" | "revoked";

export type Issuer = {
  doctorKey: string;
  licenseHash: string;
  status: IssuerStatus;
};

export class RegistryState {
  private readonly pending = new Map<string, string>();
  private readonly issuers = new Map<string, Issuer>();

  submit(doctorKey: string, licenseHash: string): void {
    if (this.pending.has(doctorKey)) {
      throw new Error("Issuer request already pending");
    }
    if (this.issuers.get(doctorKey)?.status === "approved") {
      throw new Error("Issuer already approved");
    }
    this.pending.set(doctorKey, licenseHash);
  }

  approve(doctorKey: string): void {
    const licenseHash = this.pending.get(doctorKey);
    if (!licenseHash) {
      throw new Error("Issuer request not found");
    }
    this.issuers.set(doctorKey, { doctorKey, licenseHash, status: "approved" });
    this.pending.delete(doctorKey);
  }

  revoke(doctorKey: string): void {
    const issuer = this.issuers.get(doctorKey);
    if (!issuer) {
      throw new Error("Issuer not found");
    }
    this.issuers.set(doctorKey, { ...issuer, status: "revoked" });
  }

  listPending(): Array<{ doctorKey: string; licenseHash: string }> {
    return Array.from(this.pending.entries()).map(([doctorKey, licenseHash]) => ({ doctorKey, licenseHash }));
  }

  listIssuers(): Issuer[] {
    return Array.from(this.issuers.values());
  }
}
