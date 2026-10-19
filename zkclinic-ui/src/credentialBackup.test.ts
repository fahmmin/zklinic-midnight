import { describe, expect, it } from "vitest";
import { exportCredentialBackup, parseCredentialBackup } from "./credentialBackup";

describe("credential backup", () => {
  it("round-trips credentials and proof metadata", () => {
    const backup = exportCredentialBackup(
      [
        {
          requestCode: "ABCD1234",
          credentialId: "aa".repeat(32),
          encryptedCredential: "cipher-1",
          fetchedAt: 1_700_000_000_000
        }
      ],
      [
        {
          proofId: "bb".repeat(16),
          trialId: "cc".repeat(32),
          trialTitle: "Diabetes study",
          credentialId: "aa".repeat(32),
          pseudonym: "anon-123",
          eligible: true,
          createdAt: 1_700_000_000_000,
          expiresAt: 1_700_100_000_000,
          criterionResults: []
        }
      ]
    );

    const parsed = parseCredentialBackup(backup);
    expect(parsed.credentials).toHaveLength(1);
    expect(parsed.proofs).toHaveLength(1);
    expect(parsed.credentials[0]?.requestCode).toBe("ABCD1234");
    expect(parsed.proofs[0]?.trialTitle).toBe("Diabetes study");
  });

  it("rejects unsupported versions", () => {
    expect(() => parseCredentialBackup(JSON.stringify({ version: 2, credentials: [], proofs: [] }))).toThrow(
      "Unsupported backup version"
    );
  });
});
