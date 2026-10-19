/**
 * Map technical errors to short, actionable copy for non-technical users.
 */
export function friendlyErrorMessage(raw) {
    const t = raw.trim();
    const lower = t.toLowerCase();
    if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
        return "We couldn’t reach the server. Check your internet connection, or start the verification API if you’re running locally.";
    }
    if (lower.includes("credential not yet delivered")) {
        return "Your doctor hasn’t delivered the credential yet. Ask them to finish signing, then try again.";
    }
    if (lower.includes("request not found")) {
        return "That request code wasn’t found. Double-check the code or create a new request.";
    }
    if (lower.includes("no midnight dapp connector")) {
        return "Install 1AM (1am.xyz) or another Midnight-compatible wallet with the dApp connector, then refresh this page.";
    }
    if (lower.includes("network mismatch")) {
        return t; // already user-friendly from ZkClinicApp
    }
    if (lower.includes("proof server")) {
        return "Your wallet needs a proof server URL for this network. Open wallet settings or check the README.";
    }
    return t;
}
