/** Midnight network id baked into this Vite build (`VITE_NETWORK_ID`). */
export function viteMidnightNetworkId() {
    const raw = import.meta.env.VITE_NETWORK_ID?.trim().toLowerCase();
    return raw || "preview";
}
/** Human-readable label for header / status (Preview, Preprod, …). */
export function formatMidnightNetworkLabel(networkId) {
    const id = networkId.trim().toLowerCase();
    if (!id)
        return "Preview";
    if (id === "preview")
        return "Preview";
    if (id === "preprod")
        return "Preprod";
    if (id === "undeployed")
        return "Undeployed";
    if (id === "mainnet" || id === "main")
        return "Mainnet";
    return id.charAt(0).toUpperCase() + id.slice(1);
}
