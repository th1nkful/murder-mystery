import type { DetectiveCase } from "../game/types";
import { getDifficulty } from "../game/types";
import { plural } from "../game/format";
import Portrait from "./art/Portrait";
import Scene from "./art/Scene";

interface Props {
  detectiveCase: DetectiveCase;
  locked: boolean;
  standing: number;
  onOpenClues: () => void;
}

export default function CasePanel({ detectiveCase, locked, standing, onOpenClues }: Props) {
  const { story, clues, suspects } = detectiveCase;
  const difficulty = getDifficulty(detectiveCase.difficulty);

  return (
    <div className="panel case-panel">
      <figure className="scene-frame">
        <Scene scene={story.scene} />
        <figcaption>{story.location}</figcaption>
      </figure>

      <article className="brief">
        <h2>The file so far</h2>
        <div className="victim-card">
          <Portrait seed={story.victim} tone="victim" size={84} />
          <div className="victim-detail">
            <span className="person-role">Victim</span>
            <span className="victim-name">{story.victim}</span>
            <span className="victim-where">found at {story.location}</span>
          </div>
        </div>

        <p>
          Everyone in the building that night is in this folder, and one of them is the killer.
          Clipped to the front of it is a list of things the room gave up — every one of them true
          of whoever did this.
        </p>
        <p className="brief-caveat">
          The folder is a roll of first names and nothing else. No surnames, no addresses — just
          who was in the building, and where they sit on the page. No two the same.
        </p>
        <blockquote>“{story.note}”</blockquote>
      </article>

      <dl className="case-facts">
        <div>
          <dt>Case</dt>
          <dd>{detectiveCase.code}</dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{difficulty.label}</dd>
        </div>
        <div>
          <dt>Suspects</dt>
          <dd>{suspects.length.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Standing</dt>
          <dd>{standing.toLocaleString()}</dd>
        </div>
      </dl>

      <button className="brief-cta" onClick={onOpenClues}>
        {locked
          ? `A locked file — ${plural(clues.length, "clue")}, revealed as you rule people out`
          : `Read the ${plural(clues.length, "clue")} →`}
      </button>
    </div>
  );
}
