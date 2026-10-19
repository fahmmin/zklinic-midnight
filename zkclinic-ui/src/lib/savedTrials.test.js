import { describe, expect, it } from "vitest";
import { deadlineUrgency, slotsFillPercent, toggleSavedTrialId } from "./savedTrials";
const NOW = 1_700_000_000_000;
const H = 60 * 60 * 1000;
const D = 24 * H;
describe("toggleSavedTrialId", () => {
    it("adds a new id lowercased", () => {
        expect(toggleSavedTrialId([], "ABCD")).toEqual(["abcd"]);
    });
    it("removes an existing id regardless of case", () => {
        expect(toggleSavedTrialId(["abcd", "ef01"], "ABCD")).toEqual(["ef01"]);
    });
    it("does not mutate the input list", () => {
        const input = ["aa"];
        toggleSavedTrialId(input, "bb");
        expect(input).toEqual(["aa"]);
    });
});
describe("deadlineUrgency", () => {
    it("flags passed deadlines", () => {
        expect(deadlineUrgency(NOW - 1, NOW)).toEqual({ tone: "closed", label: "Deadline passed" });
    });
    it("uses hours inside the last day", () => {
        expect(deadlineUrgency(NOW + 5 * H + 1000, NOW)).toEqual({ tone: "soon", label: "Closes in 5h" });
        expect(deadlineUrgency(NOW + 10 * 60 * 1000, NOW).label).toBe("Closes in under 1h");
    });
    it("is 'soon' up to 3 days, 'ok' beyond", () => {
        expect(deadlineUrgency(NOW + 3 * D + H, NOW)).toEqual({ tone: "soon", label: "Closes in 3d" });
        expect(deadlineUrgency(NOW + 10 * D + H, NOW)).toEqual({ tone: "ok", label: "Closes in 10d" });
    });
    it("handles non-finite deadlines", () => {
        expect(deadlineUrgency(Number.NaN, NOW).tone).toBe("ok");
    });
});
describe("slotsFillPercent", () => {
    it("computes and clamps", () => {
        expect(slotsFillPercent(3n, 12n)).toBe(25);
        expect(slotsFillPercent(20, 10)).toBe(100);
        expect(slotsFillPercent(0, 0)).toBe(0);
    });
});
