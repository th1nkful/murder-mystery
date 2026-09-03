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
        <div className="brief-people">
          <div className="person">
            <Portrait seed={story.victim} tone="victim" size={78} />
            <span className="person-role">Victim</span>
            <span className="person-name">{story.victim}</span>
          </div>
          <div className="person">
            <Portrait seed={story.client} tone="client" size={78} />
            <span className="person-role">Accused</span>
            <span className="person-name">{story.client}</span>
          </div>
        </div>

        <p>
          <strong>{story.victim}</strong> was found dead at {story.location}. The police like{" "}
          <strong>{story.client}</strong> for it — but before they were taken in, they pushed a
          folder of names and a scribbled list of clues under your door.
        </p>
        <p className="brief-caveat">
          The folder is a roll of first names and nothing else. No surnames, no addresses — just
          who was in the building, and where they sit on the page.
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
