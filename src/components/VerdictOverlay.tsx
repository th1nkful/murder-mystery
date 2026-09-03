import { useState } from "react";
import type { DetectiveCase, Suspect } from "../game/types";
import { getDifficulty } from "../game/types";
import { randomSeed } from "../game/generator";
import { formatDuration, plural } from "../game/format";
import type { CaseRef } from "../game/storage";
import Portrait from "./art/Portrait";

interface Props {
  detectiveCase: DetectiveCase;
  killer: Suspect;
  solved: boolean;
  elapsedMs: number;
  assists: number;
  wrongArrests: number;
  onNewCase: (ref: CaseRef) => void;
  onExit: () => void;
  onReviewFile: () => void;
}

export default function VerdictOverlay({
  detectiveCase,
  killer,
  solved,
  elapsedMs,
  assists,
  wrongArrests,
  onNewCase,
  onExit,
  onReviewFile,
}: Props) {
  const [shared, setShared] = useState(false);
  const difficulty = getDifficulty(detectiveCase.difficulty);

  const summary = [
    `Find the Murderer · ${detectiveCase.code}`,
    solved
      ? `Solved ${difficulty.label} in ${formatDuration(elapsedMs)}`
      : `Case went cold on ${difficulty.label}`,
    `${detectiveCase.suspects.length.toLocaleString()} suspects · ${plural(detectiveCase.clues.length, "clue")}`,
    assists === 0 ? "No help from the desk sergeant" : `${plural(assists, "clue")} applied for me`,
  ].join("\n");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: summary });
        return;
      }
      await navigator.clipboard.writeText(summary);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* the player cancelled, or the browser blocked it */
    }
  };

  return (
    <div className={solved ? "verdict solved" : "verdict failed"} role="dialog" aria-modal="true">
      <div className="verdict-inner">
        <p className="kicker">{solved ? "Case closed" : "Case cold"}</p>
        <h2>{solved ? "You got them." : "They walked."}</h2>
        <figure className="verdict-mugshot">
          <Portrait seed={`${detectiveCase.code}:${killer.id}`} tone="killer" size={104} />
          <figcaption>{killer.name}</figcaption>
        </figure>
        <p className="verdict-lede">
          The killer was <strong>{killer.name}</strong> — page {killer.page}, row {killer.row},
          column {killer.col}.
        </p>
        {!solved && (
          <p className="verdict-lede dim">
            {wrongArrests > 0
              ? `${plural(wrongArrests, "wrong arrest")} and the trail went cold.`
              : "You handed the file back."}{" "}
            Whoever killed {detectiveCase.story.victim} walked out of the building with everyone
            else.
          </p>
        )}

        <dl className="verdict-stats">
          <div>
            <dt>Time</dt>
            <dd>{formatDuration(elapsedMs)}</dd>
          </div>
          <div>
            <dt>Suspects</dt>
            <dd>{detectiveCase.suspects.length.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Clues</dt>
            <dd>{detectiveCase.clues.length}</dd>
          </div>
          <div>
            <dt>Help used</dt>
            <dd>{assists === 0 ? "none" : assists}</dd>
          </div>
        </dl>

        <div className="verdict-actions">
          <button className="primary-button" onClick={share}>
            {shared ? "Copied" : "Share the result"}
          </button>
          <button
            className="ghost-button"
            onClick={() => onNewCase({ seed: randomSeed(), difficulty: detectiveCase.difficulty })}
          >
            Another {difficulty.label.toLowerCase()} case
          </button>
          <button className="link-button" onClick={onReviewFile}>
            Look back at the casefile
          </button>
          <button className="link-button" onClick={onExit}>
            Back to the front desk
          </button>
        </div>
      </div>
    </div>
  );
}
