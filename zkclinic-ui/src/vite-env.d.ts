/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK_ID: string;
  readonly VITE_VERIFICATION_API_URL: string;
  /** 64-char hex registry contract (no 0x). Pre-fills Connect field. */
  readonly VITE_CONTRACT_ADDRESS?: string;
  /** When true, attempts one automatic join on load (opens wallet). */
  readonly VITE_AUTO_JOIN_CONTRACT?: string;
  /** Shorthand: enables one-shot auto-join when a full contract address is available (see envContract helpers). */
  readonly VITE_AUTO_CONNECT?: string;
  /** When true, shows the ZK circuits / static asset probe panel. */
  readonly VITE_SHOW_DEV_PANEL?: string;
  /** Must match ZKCLINIC_ADMIN_TOKEN on verification API to finalize medium-risk issuer reviews. */
  readonly VITE_ZKCLINIC_ADMIN_TOKEN?: string;
  /**
   * When "1" or "true", Trial programs skips verification API `/trials/validate` and `POST /trials`;
   * only on-chain `createTrial` runs. Patient browse lists from the API will not include the trial until metadata is posted.
   */
  readonly VITE_SKIP_TRIAL_METADATA_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
