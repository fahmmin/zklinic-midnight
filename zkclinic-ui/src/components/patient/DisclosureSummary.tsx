import { ui } from "../../ui";

/**
 * Explains boolean-only disclosure for trial proofs (Milestone 4).
 */
export function DisclosureSummary({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className={ui.msgMuted} style={{ margin: 0, fontSize: "0.8125rem" }}>
        <strong>Shared with the trial:</strong> pass/fail per rule + a proof ID.{" "}
        <strong>Not shared:</strong> diagnosis details, labs, medications, or your identity.
      </p>
    );
  }
  return (
    <div className={ui.highlight} data-testid="disclosure-summary" style={{ marginTop: "0.75rem" }}>
      <p className={ui.highlightLabel}>What gets disclosed</p>
      <ul className={ui.list} style={{ marginTop: "0.5rem" }}>
        <li>
          <strong>Yes</strong> — eligibility results as simple pass/fail per trial rule, plus a verifiable proof ID
          on Midnight.
        </li>
        <li>
          <strong>No</strong> — your full chart, exact diagnosis wording, lab numbers, medications, age, or name.
          Those stay encrypted on this device.
        </li>
      </ul>
    </div>
  );
}
