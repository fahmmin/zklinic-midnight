import { describe, expect, it } from "vitest";
import { computeHealthEvidenceScore, formatShortId, proofExpiresInLabel } from "./components/patient/patientCardUtils";
describe("computeHealthEvidenceScore", () => {
    it("returns 0 when revoked or expired", () => {
        expect(computeHealthEvidenceScore({
            revoked: true,
            expired: false,
            expiresAt: Date.now() + 999999,
            now: 1_000_000
        })).toBe(0);
        expect(computeHealthEvidenceScore({
            revoked: false,
            expired: true,
            expiresAt: Date.now() + 999999,
            now: 1_000_000
        })).toBe(0);
    });
    it("returns a high score when valid and far from expiry", () => {
        const now = 1_000_000;
        const expires = now + 300 * 24 * 60 * 60 * 1000;
        const s = computeHealthEvidenceScore({ revoked: false, expired: false, expiresAt: expires, now });
        expect(s).toBeGreaterThan(90);
        expect(s).toBeLessThanOrEqual(100);
    });
});
describe("formatShortId", () => {
    it("shortens long hex", () => {
        const h = "0123456789abcdef".repeat(4);
        expect(formatShortId(h, 4, 4)).toMatch(/^0123…[0-9a-f]{4}$/);
    });
});
describe("proofExpiresInLabel", () => {
    it("labels expiry", () => {
        const now = 1_000_000_000_000;
        expect(proofExpiresInLabel(now - 1000, now)).toBe("Expired");
        expect(proofExpiresInLabel(now + 3 * 24 * 60 * 60 * 1000, now)).toContain("day");
    });
});
