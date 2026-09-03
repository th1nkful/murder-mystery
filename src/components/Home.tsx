import { useMemo } from "react";
import { DIFFICULTIES, getDifficulty, type DifficultyId } from "../game/types";
import { randomSeed, todaySeed } from "../game/generator";
import { caseCode } from "../game/rng";
import { loadProgress, loadStats, type CaseRef } from "../game/storage";
import { formatDuration } from "../game/format";

interface Props {
  resumable: CaseRef | null;
  onOpenCase: (ref: CaseRef) => void;
  onShowRules: () => void;
}

export default function Home({ resumable, onOpenCase, onShowRules }: Props) {
  const stats = useMemo(() => loadStats(), []);
  const resume = useMemo(() => {
    if (!resumable) return null;
    const progress = loadProgress(resumable);
    return progress && progress.status === "playing" ? { ref: resumable, progress } : null;
  }, [resumable]);

  const daily: CaseRef = { seed: todaySeed(), difficulty: "detective" };
  const dailyDone = loadProgress(daily)?.status === "solved";

  return (
    <main className="home">
      <header className="home-head">
        <p className="kicker">Case files of the 14th precinct</p>
        <h1>
          Find the
          <br />
          <span className="blood">Murderer</span>
        </h1>
        <p className="home-lede">
          A body, a note, and a folder of names. One of them did it. Cross out everyone who
          can't have — whoever is left is your killer.
        </p>
      </header>

      {resume && (
        <button className="card card-resume" onClick={() => onOpenCase(resume.ref)}>
          <span className="card-tag">Case in progress</span>
          <span className="card-title">
            {caseCode(`${resume.ref.seed}:${resume.ref.difficulty}`)}
          </span>
          <span className="card-meta">
            {getDifficulty(resume.ref.difficulty).label} ·{" "}
            {resume.progress.eliminated.length.toLocaleString()} crossed out ·{" "}
            {formatDuration(resume.progress.elapsedMs)}
          </span>
          <span className="card-cta">Resume investigation →</span>
        </button>
      )}

      <section className="home-section">
        <h2>Open a new case</h2>
        <div className="difficulty-list">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty.id}
              className="card card-difficulty"
              onClick={() => onOpenCase({ seed: randomSeed(), difficulty: difficulty.id })}
            >
              <span className="card-title">{difficulty.label}</span>
              <span className="card-meta">{difficulty.blurb}</span>
              <span className="card-meta dim">about {difficulty.targetClues} clues</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-section">
        <button className="card card-daily" onClick={() => onOpenCase(daily)}>
          <span className="card-tag">{dailyDone ? "Solved today" : "Today's case"}</span>
          <span className="card-title">The daily file</span>
          <span className="card-meta">
            The same case for everyone, every day · {caseCode(`${daily.seed}:detective`)}
          </span>
        </button>
      </section>

      <section className="home-section home-footer">
        <button className="link-button" onClick={onShowRules}>
          How to play
        </button>
        {stats.played > 0 && (
          <p className="stats-line">
            {stats.solved} solved of {stats.played} opened
            {stats.unaided > 0 && ` · ${stats.unaided} without help`}
            {bestLine(stats.best)}
          </p>
        )}
      </section>
    </main>
  );
}

function bestLine(best: Partial<Record<DifficultyId, number>>): string {
  const entries = DIFFICULTIES.filter((d) => best[d.id] != null).map(
    (d) => `${d.label} ${formatDuration(best[d.id]!)}`,
  );
  return entries.length ? ` · best: ${entries.join(", ")}` : "";
}
