import { useState } from "react";
import type { DetectiveCase } from "../game/types";
import ClueText from "./ClueText";

interface Props {
  detectiveCase: DetectiveCase;
  checked: string[];
  assists: string[];
  locked: boolean;
  onToggle: (clueId: string) => void;
  onApply: (clueId: string) => void;
}

export default function CluesPanel({
  detectiveCase,
  checked,
  assists,
  locked,
  onToggle,
  onApply,
}: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const { story } = detectiveCase;

  return (
    <div className="panel clues-panel">
      <article className="brief">
        <h2>The file so far</h2>
        <p>
          <strong>{story.victim}</strong> was found dead at {story.location}. The police like{" "}
          <strong>{story.client}</strong> for it — but before they were taken in, they pushed a
          folder of names and a scribbled list under your door.
        </p>
        <blockquote>“{story.note}”</blockquote>
        <p className="brief-task">
          Every clue below is true of the killer. Cross out everyone in the casefile it rules out.
          One name survives all {detectiveCase.clues.length}.
        </p>
      </article>

      <ol className="clue-list">
        {detectiveCase.clues.map((clue, index) => {
          const isChecked = checked.includes(clue.id);
          const wasAssisted = assists.includes(clue.id);
          return (
            <li key={clue.id} className={isChecked ? "clue done" : "clue"}>
              <button
                className="clue-main"
                onClick={() => onToggle(clue.id)}
                aria-pressed={isChecked}
              >
                <span className="clue-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="clue-body">
                  <ClueText text={clue.text} />
                </span>
                <span className="clue-tick" aria-hidden="true">
                  {isChecked ? "✓" : ""}
                </span>
              </button>
              {!locked && !wasAssisted && (
                <div className="clue-assist">
                  {confirming === clue.id ? (
                    <>
                      <span>Cross out everyone this rules out?</span>
                      <button
                        className="assist-confirm"
                        onClick={() => {
                          onApply(clue.id);
                          setConfirming(null);
                        }}
                      >
                        Do it
                      </button>
                      <button className="assist-cancel" onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="assist-open" onClick={() => setConfirming(clue.id)}>
                      apply this for me
                    </button>
                  )}
                </div>
              )}
              {wasAssisted && <p className="clue-assist done-note">Applied for you</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
