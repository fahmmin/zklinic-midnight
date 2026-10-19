/**
 * Heuristic extraction of NMC / IMR identifiers from OCR text (India medical registration).
 */
export function extractNmcHintsFromText(text) {
    const t = text.replace(/\r/g, "\n");
    const hints = {};
    const idMatch = t.match(/(?:doctor\s*id|imr|id)[:\s#]*(\d{6,12})/i);
    if (idMatch)
        hints.doctorId = idMatch[1];
    /* Matches "Reg. No. 8506", "Registration No: 123", etc. */
    const regMatch = t.match(/(?:reg(?:istration)?\.?\s*no\.?|reg\.?\s*no\.?)[:\s#]*([0-9A-Za-z/-]{4,20})/i);
    if (regMatch)
        hints.registrationNo = regMatch[1].replace(/\s+/g, "");
    const nameLine = t.match(/(?:dr\.?|name)[:\s]+([A-Za-z][A-Za-z\s.'-]{3,80})/i);
    if (nameLine)
        hints.nameHint = nameLine[1].trim();
    const smcMatch = t.match(/(?:state\s*medical\s*council|smc|council)[:\s]+([A-Za-z][A-Za-z\s]{3,60})/i);
    if (smcMatch)
        hints.smcHint = smcMatch[1].trim();
    return hints;
}
