/**
 * One-minute guided walkthrough. Every button runs the real compiled contract circuits in this
 * browser through the simulator (no wallet, no network), so what the "study sees" panel shows is
 * read from actual public contract state.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  actor,
  attributesFromCredential,
  criteriaFromTrial,
  ZKClinic,
  ZKClinicSimulator,
  type Actor
} from "zkclinic-contract";
import { toHex } from "../lib/zkIdentity";
import "../styles/guided.css";

const TRIAL_ID = Uint8Array.from({ length: 32 }, (_, i) => (i === 31 ? 1 : 0));
const TRIAL_PLACES = 20n;
const TRIAL = {
  ageMin: 18,
  ageMax: 65,
  inclusionIcd10: ["E11.9"],
  labCriteria: [{ testName: "HbA1c", operator: ">=" as const, threshold: 7.5 }]
};

const PEOPLE = {
  asha: { name: "Asha", age: 52, hba1c: 8.2 },
  ravi: { name: "Ravi", age: 71, hba1c: 7.9 }
};
type PersonId = keyof typeof PEOPLE;

/** Contract assert messages, said the way a person would. */
const PLAIN_REASONS: [string, string][] = [
  ["Age outside trial range", "This study is for people aged 18 to 65."],
  ["Required diagnosis not present", "This study is for a condition that is not on your card."],
  ["Excluded diagnosis present", "A condition on your card rules this study out."],
  ["Lab requirement not met", "Your test result is outside the range this study needs."],
  ["Credential expired", "Your health card has expired. Ask your doctor for a new one."],
  ["Already proven", "You have already checked this study."]
];
const plainReason = (e: unknown): string => {
  const message = e instanceof Error ? e.message : String(e);
  return PLAIN_REASONS.find(([needle]) => message.includes(needle))?.[1] ?? message;
};

const short = (b: Uint8Array) => `${toHex(b).slice(0, 10)}…`;

type Stage = "card" | "study" | "qualified" | "rejected" | "enrolled";
const STEP_OF: Record<Stage, number> = { card: 1, study: 2, qualified: 3, rejected: 3, enrolled: 4 };

type World = { sim: ZKClinicSimulator; manager: Actor; patient: Actor; commitment: Uint8Array };

export function GuidedDemo() {
  const [personId, setPersonId] = useState<PersonId>("asha");
  const [stage, setStage] = useState<Stage>("card");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [codeName, setCodeName] = useState<Uint8Array | null>(null);
  const world = useRef<World | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const person = PEOPLE[personId];

  // Move focus to the new step so screen readers and keyboard users follow along.
  useEffect(() => {
    heading.current?.focus();
  }, [stage]);

  /** Let the "working" label paint before a synchronous circuit run. */
  const run = (work: () => Promise<void>) => {
    setBusy(true);
    setTimeout(() => {
      work().finally(() => setBusy(false));
    }, 30);
  };

  const restart = (next: PersonId) => {
    world.current = null;
    setCodeName(null);
    setReason("");
    setPersonId(next);
    setStage("card");
  };

  const signCard = () =>
    run(async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const admin = actor(1);
      const doctor = actor(2);
      const manager = actor(3);
      const patient = actor(
        4,
        attributesFromCredential(
          {
            ageYears: person.age,
            icd10Codes: ["E11.9"],
            labResults: [{ testName: "HbA1c", value: person.hba1c }],
            expiresAt: (nowSeconds + 365 * 86_400) * 1000
          },
          crypto.getRandomValues(new Uint8Array(32))
        )
      );
      patient.privateState = { ...patient.privateState, secretKey: crypto.getRandomValues(new Uint8Array(32)) };
      const sim = await ZKClinicSimulator.create(admin);
      sim.now = nowSeconds;
      await sim.submitIssuerRequest(doctor, crypto.getRandomValues(new Uint8Array(32)));
      await sim.approveIssuer(admin, doctor);
      await sim.createTrial(manager, TRIAL_ID, TRIAL_PLACES);
      await sim.publishTrialCriteria(manager, TRIAL_ID, criteriaFromTrial(TRIAL));
      const commitment = sim.commitmentFor(patient);
      await sim.issueCredentialCommitment(doctor, commitment);
      world.current = { sim, manager, patient, commitment };
      setStage("study");
    });

  const checkEligibility = () =>
    run(async () => {
      const w = world.current!;
      try {
        setCodeName(await w.sim.proveEligibility(w.patient, TRIAL_ID));
        setStage("qualified");
      } catch (e) {
        setReason(plainReason(e));
        setStage("rejected");
      }
    });

  const join = () =>
    run(async () => {
      const w = world.current!;
      await w.sim.recordEnrollment(w.manager, TRIAL_ID, codeName!);
      setStage("enrolled");
    });

  const w = world.current;
  const placesFilled = w ? w.sim.ledger.trials.lookup(TRIAL_ID).slotsFilled : 0n;
  const step = STEP_OF[stage];

  return (
    <div className="gd" data-testid="guided-demo">
      <header className="gd-top">
        <Link to="/" className="gd-brand">
          ZKLinic
        </Link>
        <p className="gd-progress" aria-label={`Step ${step} of 4`}>
          <span>Step {step} of 4</span>
          <span className="gd-bar" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <i key={n} data-on={n <= step} />
            ))}
          </span>
        </p>
      </header>

      <main className="gd-main">
        <section className="gd-step" aria-live="polite">
          {stage === "card" && (
            <>
              <h1 ref={heading} tabIndex={-1}>
                This is your health card, {person.name}
              </h1>
              <p>Your doctor checks it and signs it. It stays on your phone.</p>
              <dl className="gd-card">
                <div>
                  <dt>Age</dt>
                  <dd>{person.age}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>Type 2 diabetes</dd>
                </div>
                <div>
                  <dt>Blood sugar (HbA1c)</dt>
                  <dd>{person.hba1c}%</dd>
                </div>
              </dl>
              <div className="gd-actions">
              <button className="gd-go" onClick={signCard} disabled={busy} data-testid="gd-sign">
                {busy ? "Doctor is signing…" : "Ask my doctor to sign it"}
              </button>
            </div>
            </>
          )}

          {stage === "study" && (
            <>
              <h1 ref={heading} tabIndex={-1}>
                A study is looking for people
              </h1>
              <p>Signed. Now see if this study fits you. The study will not see your card.</p>
              <dl className="gd-card">
                <div>
                  <dt>Study</dt>
                  <dd>New treatment for type 2 diabetes</dd>
                </div>
                <div>
                  <dt>Who can join</dt>
                  <dd>Age 18 to 65, HbA1c 7.5% or higher</dd>
                </div>
                <div>
                  <dt>Places</dt>
                  <dd>{TRIAL_PLACES.toString()}</dd>
                </div>
              </dl>
              <div className="gd-actions">
              <button className="gd-go" onClick={checkEligibility} disabled={busy} data-testid="gd-check">
                {busy ? "Checking on your phone…" : "Check if I qualify"}
              </button>
            </div>
            </>
          )}

          {stage === "qualified" && (
            <>
              <h1 ref={heading} tabIndex={-1} className="gd-yes">
                Yes, you qualify
              </h1>
              <p>
                The study got a yes and a code name for you. It did not get your age, your condition or your test
                result.
              </p>
              <div className="gd-actions">
              <button className="gd-go" onClick={join} disabled={busy} data-testid="gd-join">
                {busy ? "Saving your place…" : "Join the study"}
              </button>
            </div>
            </>
          )}

          {stage === "rejected" && (
            <>
              <h1 ref={heading} tabIndex={-1}>
                This study is not a match
              </h1>
              <p data-testid="gd-reason">{reason}</p>
              <p>Nothing about you was shared. The study does not know you checked.</p>
              <div className="gd-actions">
              <button className="gd-go" onClick={() => restart("asha")} data-testid="gd-restart">
                Start again as Asha, 52
              </button>
            </div>
            </>
          )}

          {stage === "enrolled" && (
            <>
              <h1 ref={heading} tabIndex={-1} className="gd-yes">
                You are in
              </h1>
              <p>
                Your place is saved under your code name. {placesFilled.toString()} of {TRIAL_PLACES.toString()}{" "}
                places are now taken. The study still has not seen your records.
              </p>
              <div className="gd-actions">
              <Link className="gd-go" to="/app/patient" data-testid="gd-real">
                Use it with my own wallet
              </Link>
              <button className="gd-alt" onClick={() => restart("ravi")} data-testid="gd-ravi">
                Try again as Ravi, 71, who is too old for this study
              </button>
            </div>
            </>
          )}
        </section>

        <aside className="gd-ledger" aria-label="What is private and what is public">
          <div className="gd-private">
            <h2>Stays on your phone</h2>
            <ul>
              <li>Age {person.age}</li>
              <li>Type 2 diabetes</li>
              <li>HbA1c {person.hba1c}%</li>
              <li>Your secret key</li>
            </ul>
          </div>
          <div className="gd-public">
            <h2>What the study can see</h2>
            <ul data-testid="gd-public-list">
              {!w && <li className="gd-empty">Nothing yet</li>}
              {w && (
                <li>
                  A sealed fingerprint of a signed card <code>{short(w.commitment)}</code>
                </li>
              )}
              {codeName && (
                <li>
                  A yes for code name <code>{short(codeName)}</code>
                </li>
              )}
              {stage === "enrolled" && <li>That code name took a place</li>}
              {stage === "rejected" && <li className="gd-empty">No sign that you checked</li>}
            </ul>
          </div>
          <p className="gd-note">
            Demo mode. These buttons run the real {Object.keys(ZKClinic.pureCircuits).length + 13}-circuit Midnight
            contract inside this page, without a wallet or network.{" "}
            <Link to="/docs">How it works</Link>
          </p>
        </aside>
      </main>
    </div>
  );
}
