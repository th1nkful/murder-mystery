import { useState } from "react";
import type { DetectiveCase } from "../game/types";
import ClueText from "./ClueText";

interface Props {
  detectiveCase: DetectiveCase;
  checked: string[];
  assists: string[];
  locked: boolean;
  /** In a locked file, how many clues are unlocked. */
  revealed: number;
  /** Suspects still standing, and how few are needed to unlock the next clue. */
  standing: number;
  unlockAt: number | null;
  disabled: boolean;
  onToggle: (clueId: string) => void;
  onApply: (clueId: string) => void;
}

export default function CluesPanel({
  detectiveCase,
  checked,
  assists,
  locked,
  revealed,
  standing,
  unlockAt,
  disabled,
  onToggle,
  onApply,
}: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const visible = locked ? detectiveCase.clues.slice(0, revealed) : detectiveCase.clues;
  const hidden = detectiveCase.clues.length - visible.length;

  return (
    <div className="panel clues-panel">
      <p className="clues-lede">
        Every clue is true of the killer. Cross out everyone in the casefile it rules out — one
        name survives all {detectiveCase.clues.length}.
      </p>

      <ol className="clue-list">
        {visible.map((clue, index) => {
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
              {!disabled && !wasAssisted && (
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

      {hidden > 0 && (
        <div className="clue-locked">
          <span className="lock-icon" aria-hidden="true">
            ✦
          </span>
          <p className="lock-title">
            {hidden === 1 ? "One more clue" : `${hidden} more clues`} in the envelope
          </p>
          {unlockAt != null && (
            <p className="lock-body">
              The next one opens once <strong>{unlockAt.toLocaleString()}</strong> or fewer
              suspects are left standing. You have{" "}
              <strong>{standing.toLocaleString()}</strong> —{" "}
              {standing > unlockAt
                ? `${(standing - unlockAt).toLocaleString()} still to rule out.`
                : "opening now."}
            </p>
          )}
          <p className="lock-note">
            Work the clues you have. The file gives up the rest as you narrow it down.
          </p>
        </div>
      )}
    </div>
  );
}
