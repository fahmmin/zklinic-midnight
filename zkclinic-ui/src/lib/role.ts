/** Each wallet picks one role once; the app then opens straight into it. Demo mode exposes a switcher for recordings. */
export type Role = "patient" | "doctor" | "trials";

const ROLES: Role[] = ["patient", "doctor", "trials"];
const roleKey = (wallet: string) => `zkclinic-role:${wallet}`;
const DEMO_KEY = "zkclinic-demo-mode";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function isRole(s: string | undefined | null): s is Role {
  return !!s && ROLES.includes(s as Role);
}

export function storedRole(wallet: string): Role | null {
  const r = read(roleKey(wallet));
  return isRole(r) ? r : null;
}

export function saveRole(wallet: string, role: Role | null): void {
  write(roleKey(wallet), role);
}

/** `?demo=1` turns demo mode on (and `?demo=0` off); it sticks for later visits. */
export function isDemoMode(): boolean {
  const q = new URLSearchParams(window.location.search).get("demo");
  if (q === "1" || q === "0") write(DEMO_KEY, q === "1" ? "1" : null);
  return read(DEMO_KEY) === "1";
}

export function setDemoMode(on: boolean): void {
  write(DEMO_KEY, on ? "1" : null);
}
