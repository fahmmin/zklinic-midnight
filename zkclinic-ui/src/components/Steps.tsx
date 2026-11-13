import { Children, type ReactNode } from "react";

/**
 * One step on screen at a time, with numbered tabs to jump around and Back / Next at the bottom.
 * Controlled, so a screen can move the person forward itself when an action succeeds.
 */
export function Steps({
  labels,
  step,
  onStep,
  children
}: {
  labels: string[];
  step: number;
  onStep: (step: number) => void;
  children: ReactNode;
}) {
  const panels = Children.toArray(children);
  const last = labels.length - 1;
  return (
    <div className="zk-steps" data-testid="steps">
      <ol className="zk-steps__tabs">
        {labels.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              className="zk-steps__tab"
              aria-current={i === step ? "step" : undefined}
              data-done={i < step}
              onClick={() => onStep(i)}
              data-testid={`step-tab-${i + 1}`}
            >
              <span className="zk-steps__num">{i + 1}</span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="zk-steps__panel" data-testid={`step-panel-${step + 1}`}>
        {panels[step]}
      </div>

      <div className="zk-steps__nav">
        {step > 0 && (
          <button type="button" className="zk-btn" onClick={() => onStep(step - 1)} data-testid="step-back">
            Back
          </button>
        )}
        {step < last && (
          <button type="button" className="zk-btn zk-steps__next" onClick={() => onStep(step + 1)} data-testid="step-next">
            Next: {labels[step + 1]}
          </button>
        )}
      </div>
    </div>
  );
}
