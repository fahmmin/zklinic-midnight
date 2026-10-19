import type { ReactNode } from "react";
import { MarketingNav } from "../components/landing/MarketingNav";

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-border bg-muted px-1.5 py-0.5 text-[0.85em] text-foreground">{children}</code>
  );
}

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 font-display text-2xl tracking-tight text-foreground md:text-3xl">
      {children}
    </h2>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-muted-foreground">{children}</p>;
}

const toc = [
  ["overview", "Overview"],
  ["trust-model", "Trust model & data boundaries"],
  ["visibility", "Public vs private — who sees what"],
  ["architecture", "System architecture"],
  ["stack", "Runtime & dependencies"],
  ["configuration", "Configuration"],
  ["wallet", "Wallet & network"],
  ["contracts", "Contracts: CLI deploy & UI join"],
  ["issuer-registry", "Trusted issuer registry"],
  ["credentials", "Credentials"],
  ["trials", "Trial registry & criteria"],
  ["proofs", "Proofs & circuits"],
  ["private-state", "Private state storage"],
  ["verification-api", "Verification API"],
  ["ui", "Application surfaces"],
  ["build", "Build pipeline & artifacts"],
  ["local-dev", "Local development"],
  ["troubleshooting", "Troubleshooting"]
] as const;

export function DocsPage() {
  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="docs-page">
      <MarketingNav />
      <div className="mx-auto max-w-4xl px-6 pb-28 pt-6 md:px-12 md:pt-10">
        <header className="border-b border-border pb-8">
          <p className="text-sm font-medium text-muted-foreground">ZKClinic · Developer documentation</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground md:text-5xl">Technical reference</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Protocol-oriented documentation for the ZKClinic stack on Midnight: contracts, wallet integration,
            private state, and how each layer enforces the recruitment and privacy model.
          </p>
        </header>

        <nav
          aria-label="On this page"
          className="sticky top-0 z-10 -mx-1 my-8 border-y border-border bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
          <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-accent hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="space-y-8 text-[15px]">
          <section className="space-y-4" aria-labelledby="overview">
            <H2 id="overview">Overview</H2>
            <P>
              ZKClinic is a <strong className="font-medium text-foreground">ZK-native clinical trial recruitment</strong>{" "}
              protocol on Midnight. The product separates three concerns: (1) who may sign clinical credentials
              (on-chain issuer registry), (2) what a patient stores locally (encrypted credential payload), and
              (3) what observers—including trial sponsors—may learn from the ledger (verification of issuer
              validity, per-criterion eligibility booleans, and binding to a specific trial), without receiving
              raw clinical fields.
            </P>
            <P>
              This documentation describes how the reference implementation wires those concerns together:
              Compact contracts, <Code>@midnight-ntwrk/midnight-js-*</Code> providers, Lace via the DApp
              connector API, and browser private state.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="trust-model">
            <H2 id="trust-model">Trust model &amp; data boundaries</H2>
            <P>
              <strong className="font-medium text-foreground">Verified on-chain (public integrity):</strong> whether
              a credential issuer is currently registered and authorized; whether a posted proof is bound to a
              specific trial identifier; the boolean outcome per eligibility criterion exposed by the proof;
              cryptographic linkage between proof, trial, and issuer policy as enforced by the circuits and
              contract rules.
            </P>
            <P>
              <strong className="font-medium text-foreground">Stays off-chain / on-device (private):</strong>{" "}
              patient identity, exact diagnoses, labs, medications, free-text notes, and any field that is not
              strictly required to appear as a public boolean. The intended verifier (trial recruiter) receives
              criterion-level eligibility and independently verifiable proof metadata—not a dump of the medical
              record.
            </P>
            <P>
              ZKClinic is <strong className="font-medium text-foreground">not</strong> a diagnostic system or a
              longitudinal records repository; it is infrastructure for proving trial fit without turning the
              patient into a data source for the sponsor.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="visibility">
            <H2 id="visibility">Public vs private — who sees what</H2>
            <P>
              <strong className="font-medium text-foreground">On Midnight (public to indexers / observers):</strong>{" "}
              contract state such as admin, issuer records (doctor coin public keys, license hashes, approval status),
              the map from each <Code>credentialId</Code> (32-byte id) to the issuing doctor&apos;s key, revocation
              flags for those ids, and trial registry fields (trial ids, manager keys, criteria hashes, slot counts,
              etc.). None of that payload includes free-text charts, patient name, or diagnosis narratives — but it
              does reveal that <em>some</em> credential id was registered by <em>some</em> approved issuer at a given
              time, and trial activity tied to public keys.
            </P>
            <P>
              <strong className="font-medium text-foreground">Encrypted credential blob (confidentiality = key
              possession):</strong> the health payload is AES-GCM encrypted. <strong className="font-medium text-foreground">First
              delivery</strong> uses a key derived from the shared <Code>requestCode</Code> (
              <Code>zkclinic-credential:</Code> + code). <strong className="font-medium text-foreground">Continuing the
              same card</strong> (same <Code>credentialId</Code>) uses a key derived from{" "}
              <Code>zkclinic-credential-card:</Code> + credential id so the patient can decrypt follow-up visits with
              the id they already store. The client tries the request-code key first, then the card key. The API only
              sees ciphertext.
            </P>
            <P>
              <strong className="font-medium text-foreground">Verification API (reference implementation — important):</strong>{" "}
              when the patient creates a request, optional <Code>patientIntake</Code> JSON is persisted{" "}
              <strong className="font-medium text-foreground">in plaintext</strong> server-side so the doctor can
              preview it via the request code. Treat the API as a relay with TLS + your own access controls: anyone
              who obtains the active request code can read that intake from the API before delivery. This is not the
              same privacy posture as the encrypted post-issuance payload.
            </P>
            <P>
              <strong className="font-medium text-foreground">Patient device:</strong> browser storage holds encrypted
              credentials and the request codes used to fetch them — protect the device.
            </P>
            <P>
              <strong className="font-medium text-foreground">Same card, multiple visits (on-chain + off-chain):</strong>{" "}
              <Code>registerCredential</Code> runs once per <Code>credentialId</Code>. Each signed visit then calls{" "}
              <Code>appendDiagnosisToCredential</Code>, which stores a new 32-byte commitment in{" "}
              <Code>diagnosisCommitmentBySlot</Code> (keyed by credential id + slot index) — only the doctor who
              registered that id may append. The full ICD list and narrative stay in the encrypted payload (updated each
              visit). <strong className="font-medium text-foreground">Limitation:</strong> another clinician cannot
              append to the same id unless you extend the contract with multi-issuer or transfer rules.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="architecture">
            <H2 id="architecture">System architecture</H2>
            <P>
              End-to-end flow (target architecture): a licensed issuer registered on Midnight signs a structured
              credential; the patient holds it locally; at application time the client derives a zero-knowledge
              proof that evaluates trial criteria against that credential; a compact transaction posts the
              minimum disclosure bundle to Midnight; indexers and the app surface proof IDs to recruiters.
            </P>
            <P>
              The web UI (<Code>zkclinic-ui</Code>) hosts role-specific flows—registry administration, doctor and
              patient workflows, trial definition and browse—on top of a shared{" "}
              <Code>ZKClinicProvider</Code> that encapsulates wallet lifecycle, contract calls, and private state
              IO.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="stack">
            <H2 id="stack">Runtime &amp; dependencies</H2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">Compact / ledger:</strong>{" "}
                <Code>@midnight-ntwrk/compact-js</Code>, <Code>@midnight-ntwrk/compact-runtime</Code>,{" "}
                <Code>@midnight-ntwrk/ledger-v7</Code>, packaged contract <Code>zkclinic-contract</Code>.
              </li>
              <li>
                <strong className="font-medium text-foreground">Transactions &amp; proofs:</strong>{" "}
                <Code>@midnight-ntwrk/midnight-js-contracts</Code>, HTTP proof provider, fetch-based ZK config
                provider.
              </li>
              <li>
                <strong className="font-medium text-foreground">Chain data:</strong> indexer-backed public data
                provider for observing contract state.
              </li>
              <li>
                <strong className="font-medium text-foreground">Private state:</strong>{" "}
                <Code>levelPrivateStateProvider</Code> in the browser (IndexedDB-backed store name aligned with
                CLI defaults).
              </li>
              <li>
                <strong className="font-medium text-foreground">Wallet:</strong> Lace (or compatible) via{" "}
                <Code>@midnight-ntwrk/dapp-connector-api</Code>.
              </li>
            </ul>
          </section>

          <section className="space-y-4" aria-labelledby="configuration">
            <H2 id="configuration">Configuration</H2>
            <P>Environment variables consumed by the UI build (Vite):</P>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 font-medium text-foreground">Variable</th>
                    <th className="px-4 py-3 font-medium text-foreground">Role</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">VITE_NETWORK_ID</td>
                    <td className="px-4 py-3">
                      Midnight network id (e.g. <Code>preview</Code> or <Code>preprod</Code>). Must match the wallet
                      network; also set at bootstrap via <Code>setNetworkId</Code> in <Code>main.tsx</Code>. Use{" "}
                      <Code>.env.preview</Code> / <Code>.env.preprod</Code> with <Code>npm run dev:preview</Code> /{" "}
                      <Code>npm run dev:preprod</Code> (or matching <Code>build:*</Code> scripts).
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">VITE_VERIFICATION_API_URL</td>
                    <td className="px-4 py-3">
                      Base URL for off-chain verification services used by trial flows (defaults to{" "}
                      <Code>http://localhost:4100</Code> when unset).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P>
              Rebuild after changing env: production bundles embed these at compile time. For CI and multiple
              environments, maintain separate <Code>.env</Code> files or pipeline secrets per target network.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="wallet">
            <H2 id="wallet">Wallet &amp; network</H2>
            <P>
              The app expects a Midnight-capable wallet exposing the DApp connector API. On connect, the context
              reads network id from the wallet and compares it to <Code>VITE_NETWORK_ID</Code>; a mismatch surfaces
              a blocking error so users do not sign transactions against the wrong network.
            </P>
            <P>
              Private state encryption keys are derived from the wallet&apos;s encryption public key material
              (with defensive parsing for multiple encodings). The password material must satisfy the minimum
              length required by <Code>levelPrivateStateProvider</Code> (≥16 characters after normalization).
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="contracts">
            <H2 id="contracts">Contracts: CLI deploy &amp; UI join</H2>
            <P>
              Like <strong className="font-medium text-foreground">example-zkloan</strong>, the web UI only{" "}
              <strong className="font-medium text-foreground">joins</strong> an existing contract by address.
              Deploy a new ZKClinic registry with <Code>zkclinic-cli</Code> using the same{" "}
              <Code>zkclinic-contract</Code> artifacts and <Code>midnight-js-contracts</Code> deployment flow.
            </P>
            <P>
              After connecting, the Registry tab shows the contract address and <strong className="font-medium text-foreground">refresh state</strong> pulls the latest public ledger view via the indexer-backed provider.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="issuer-registry">
            <H2 id="issuer-registry">Trusted issuer registry</H2>
            <P>
              Doctors request issuer status by submitting a <strong className="font-medium text-foreground">license hash</strong> (32-byte value) through the contract; administrators approve or revoke issuers. Revocation and pending queues are observable in public state—this is the trust foundation before any credential is considered valid in downstream proofs.
            </P>
            <P>
              The hash is stored on-chain; raw license numbers or national identifiers must not be posted. Off-chain verification (jurisdiction-specific) is expected to gate admin approval in production deployments.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="credentials">
            <H2 id="credentials">Credentials</H2>
            <P>
              Signed health credentials are the atomic unit of the system. After issuance, the patient holds an
              encrypted payload locally; the reference verification API also stores that ciphertext for pickup. Plain
              patient-supplied intake may exist on the API only for the pending request (see{" "}
              <a href="#visibility" className="text-accent hover:underline">
                visibility
              </a>
              ).
            </P>
            <P>
              Expiry, revocation, and backup/export paths are part of the credential lifecycle—when a credential
              is revoked on-chain or by the issuer, client flows must treat it as invalid for new proofs.
            </P>
            <P>
              <strong className="font-medium text-foreground">Same id across visits:</strong> the patient can flag{" "}
              <Code>continuingCredentialId</Code> when creating a request. The doctor reuses that id, encrypts with the
              card-derived key, and appends a diagnosis commitment on-chain. You can still merge older text into the
              form for richer intake before each request.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="trials">
            <H2 id="trials">Trial registry &amp; criteria</H2>
            <P>
              Trial managers publish structured criteria (e.g. ICD-10 selections, age bands, lab thresholds,
              exclusions). The trial registry contract holds identifiers, criteria blobs, enrollment caps, and
              status so patients can browse and apply against a canonical on-chain definition.
            </P>
            <P>
              Trial-facing UIs call the verification API for preflight validation (e.g. ensuring ICD codes and
              thresholds are coherent) before transactions are composed—reducing failed submissions and junk data
              on-chain.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="proofs">
            <H2 id="proofs">Proofs &amp; circuits</H2>
            <P>
              The roadmap includes discrete circuits—for example: credential integrity, issuer verification
              against the registry, eligibility evaluation against trial criteria, credential-to-trial binding,
              and trial-scoped pseudonym derivation. Proofs are generated where the credential lives (patient
              device); only the agreed public outputs are posted.
            </P>
            <P>
              Operational guidance: pin proof-verifier versions with contract releases, document circuit change
              logs alongside contract upgrades, and test cross-version behavior when trials span long horizons.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="private-state">
            <H2 id="private-state">Private state storage</H2>
            <P>
              Browser private state uses a named store (<Code>zkclinic-private-state</Code>) aligned with CLI
              tooling so developers can reason about a single persistence layout across interfaces. Data at rest
              relies on keys derived from wallet material—protecting against casual inspection but not replacing
              device-level security policies.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="verification-api">
            <H2 id="verification-api">Verification API</H2>
            <P>
              Trial browse and manager flows call <Code>VITE_VERIFICATION_API_URL</Code> for server-assisted checks
              that should not be duplicated in every client—code validation, organizational verification hooks,
              and similar. Run a compatible service locally during development or point to your deployment in
              staging/production.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="ui">
            <H2 id="ui">Application surfaces</H2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">Registry</strong> — contract join (CLI deploy),
                issuer requests,
                admin approve/revoke, raw ledger inspection.
              </li>
              <li>
                <strong className="font-medium text-foreground">Patient</strong> — gated flows for credential and
                trial participation (implementation evolves with milestones).
              </li>
              <li>
                <strong className="font-medium text-foreground">Doctor</strong> — issuance and request handling
                aligned with verification policy.
              </li>
              <li>
                <strong className="font-medium text-foreground">Trials</strong> — browse/post/manager surfaces
                backed by contract + verification API.
              </li>
            </ul>
          </section>

          <section className="space-y-4" aria-labelledby="build">
            <H2 id="build">Build pipeline &amp; artifacts</H2>
            <P>
              Before dev or build, run <Code>npm run copy-contract-assets</Code> (workspace script) to copy managed
              Compact outputs into <Code>public/zkclinic</Code> so the bundler can fetch WASM and metadata at
              runtime.
            </P>
            <P>
              Standard scripts: <Code>npm run dev</Code> (preview), <Code>npm run dev:preprod</Code>,{" "}
              <Code>npm run dev:undeployed</Code> (local); <Code>npm run build:preview</Code>,{" "}
              <Code>npm run build:preprod</Code>, <Code>npm run build:undeployed</Code>, and <Code>npm run build</Code>{" "}
              (preview); plus <Code>npm run typecheck</Code>, <Code>npm run test</Code>, <Code>npm run test:e2e</Code>.
            </P>
          </section>

          <section className="space-y-4" aria-labelledby="local-dev">
            <H2 id="local-dev">Local development</H2>
            <ol className="list-decimal space-y-2 pl-6 leading-relaxed text-muted-foreground">
              <li>Install dependencies at the workspace root and in <Code>zkclinic-ui</Code>.</li>
              <li>
                Copy contract artifacts; align <Code>VITE_NETWORK_ID</Code> with your Lace network.
              </li>
              <li>
                Run the verification API locally if trial features are in scope, or stub responses for UI work.
              </li>
              <li>
                Deploy a contract with <Code>zkclinic-cli</Code>, join from the UI by address, then exercise registry flows before layering trial/credential proofs.
              </li>
            </ol>
          </section>

          <section className="space-y-4" aria-labelledby="troubleshooting">
            <H2 id="troubleshooting">Troubleshooting</H2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">Network mismatch</strong> — Wallet network id
                must equal the build&apos;s <Code>VITE_NETWORK_ID</Code>; switch Lace or rebuild.
              </li>
              <li>
                <strong className="font-medium text-foreground">Private state errors</strong> — Confirm encryption
                key parsing succeeded; avoid clearing IndexedDB while debugging unless you intend to reset local
                credentials.
              </li>
              <li>
                <strong className="font-medium text-foreground">Missing WASM / contract assets</strong> — Re-run{" "}
                <Code>copy-contract-assets</Code> after contract builds.
              </li>
              <li>
                <strong className="font-medium text-foreground">Verification API failures</strong> — Check{" "}
                <Code>VITE_VERIFICATION_API_URL</Code> reachability and CORS for browser calls.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
