function truthyEnv(v) {
    return v === "true" || v === "1";
}
/** Contract address from build-time env (paste deployment hex without 0x or with). */
export function defaultContractAddressFromEnv() {
    return (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim().replace(/^0x/i, "");
}
/** When true, `VITE_AUTO_CONNECT` also opts into one-shot auto-join (see `shouldAutoJoinContract`). */
export function shouldAutoConnectFromEnv() {
    return truthyEnv(import.meta.env.VITE_AUTO_CONNECT);
}
export function shouldAutoJoinContract() {
    return shouldAutoConnectFromEnv() || truthyEnv(import.meta.env.VITE_AUTO_JOIN_CONTRACT);
}
/** Developer circuit / asset probe panel (off by default for production-like UI). */
export function showDevToolsPanel() {
    const v = import.meta.env.VITE_SHOW_DEV_PANEL;
    return v === "true" || v === "1";
}
