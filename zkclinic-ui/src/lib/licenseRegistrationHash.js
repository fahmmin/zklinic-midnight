/**
 * Must match zkclinic-verification-api issuer-registration license hash
 * (stable JSON of doctorId, regdNoValue, imr + certificate text).
 */
import { stableStringify } from "../trialCriteria";
export async function computeIssuerRegistrationLicenseHash(parts) {
    const payload = stableStringify({
        doctorId: parts.doctorId.trim().toLowerCase(),
        regdNoValue: parts.regdNoValue.trim(),
        imrRecordText: (parts.imrRecordText ?? "").trim(),
        certificateOcrText: (parts.certificateOcrText ?? "").trim()
    });
    const enc = new TextEncoder().encode(payload);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
