import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateCase } from "../game/generator";
import { getDifficulty, type Suspect } from "../game/types";
import {
  loadProgress,
  newProgress,
  recordOpened,
  recordSolved,
  saveProgress,
  type CaseProgress,
  type CaseRef,
} from "../game/storage";
import { formatDuration, plural } from "../game/format";
import CluesPanel from "./CluesPanel";
import CasefilePanel from "./CasefilePanel";
import ArrestSheet from "./ArrestSheet";
import SearchSheet from "./SearchSheet";
import VerdictOverlay from "./VerdictOverlay";
import Sheet from "./Sheet";

const MAX_ARRESTS = 3;
const SAVE_DEBOUNCE_MS = 400;
const TIMER_SAVE_MS = 10_000;

interface Props {
  caseRef: CaseRef;
  onExit: () => void;
  onOpenCase: (ref: CaseRef) => void;
  onShowRules: () => void;
}

type SheetKind = "arrest" | "search" | "menu" | null;

function progressStatus(caseRef: CaseRef) {
  return loadProgress(caseRef)?.status ?? "playing";
}

export default function Game({ caseRef, onExit, onOpenCase, onShowRules }: Props) {
  const detectiveCase = useMemo(
    () => generateCase(caseRef.seed, caseRef.difficulty),
    [caseRef.seed, caseRef.difficulty],
  );
  const difficulty = getDifficulty(caseRef.difficulty);

  const [progress, setProgress] = useState<CaseProgress>(
    () => loadProgress(caseRef) ?? newProgress(caseRef),
  );
  const [elapsed, setElapsed] = useState(progress.elapsedMs);
  const [tab, setTab] = useState<"clues" | "file">("clues");
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [spotlight, setSpotlight] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<number[][]>([]);
  const [verdictOpen, setVerdictOpen] = useState(() => progressStatus(caseRef) !== "playing");

  const eliminated = useMemo(() => new Set(progress.eliminated), [progress.eliminated]);
  const standing = detectiveCase.suspects.length - eliminated.size;
  const killer = detectiveCase.suspects[detectiveCase.killerId];

  /* ---------------- persistence ---------------- */

  // What a save would write right now. Kept in a ref so the interval and the
  // pagehide listener can flush the latest state without being re-registered.
  const snapshot = useRef(progress);
  useEffect(() => {
    snapshot.current = { ...progress, elapsedMs: elapsed };
  });

  useEffect(() => {
    if (loadProgress(caseRef) == null) recordOpened();
  }, [caseRef]);

  useEffect(() => {
    const id = setTimeout(() => saveProgress(snapshot.current), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [progress]);

  useEffect(() => {
    const flush = () => saveProgress(snapshot.current);
    const id = setInterval(flush, TIMER_SAVE_MS);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, []);

  /* ---------------- clock ---------------- */

  useEffect(() => {
    if (progress.status !== "playing") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setElapsed((ms) => ms + 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [progress.status]);

  /* ---------------- actions ---------------- */

  const pushUndo = useCallback(() => {
    setUndoStack((stack) => [...stack.slice(-19), progress.eliminated]);
  }, [progress.eliminated]);

  const toggleSuspect = useCallback((id: number) => {
    setProgress((p) => {
      if (p.status !== "playing") return p;
      const has = p.eliminated.includes(id);
      return {
        ...p,
        eliminated: has ? p.eliminated.filter((x) => x !== id) : [...p.eliminated, id],
      };
    });
  }, []);

  const toggleClue = useCallback((clueId: string) => {
    setProgress((p) => ({
      ...p,
      checked: p.checked.includes(clueId)
        ? p.checked.filter((x) => x !== clueId)
        : [...p.checked, clueId],
    }));
  }, []);

  const applyClue = useCallback(
    (clueId: string) => {
      const clue = detectiveCase.clues.find((c) => c.id === clueId);
      if (!clue) return;
      pushUndo();
      setProgress((p) => {
        if (p.status !== "playing") return p;
        const next = new Set(p.eliminated);
        for (const suspect of detectiveCase.suspects) {
          if (!clue.test(suspect)) next.add(suspect.id);
        }
        return {
          ...p,
          eliminated: [...next],
          checked: p.checked.includes(clueId) ? p.checked : [...p.checked, clueId],
          assists: p.assists.includes(clueId) ? p.assists : [...p.assists, clueId],
        };
      });
    },
    [detectiveCase, pushUndo],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setProgress((p) => ({ ...p, eliminated: previous }));
      return stack.slice(0, -1);
    });
  }, []);

  const arrest = useCallback(
    (suspect: Suspect) => {
      setSheet(null);
      setVerdictOpen(true);
      setProgress((p) => {
        if (p.status !== "playing") return p;
        if (suspect.id === detectiveCase.killerId) {
          recordSolved(caseRef.difficulty, snapshot.current.elapsedMs, p.assists.length);
          return { ...p, status: "solved" };
        }
        const wrongArrests = p.wrongArrests + 1;
        return {
          ...p,
          wrongArrests,
          eliminated: p.eliminated.includes(suspect.id)
            ? p.eliminated
            : [...p.eliminated, suspect.id],
          status: wrongArrests >= MAX_ARRESTS ? "failed" : "playing",
        };
      });
    },
    [caseRef.difficulty, detectiveCase.killerId],
  );

  const giveUp = useCallback(() => {
    setSheet(null);
    setVerdictOpen(true);
    setProgress((p) => (p.status === "playing" ? { ...p, status: "failed" } : p));
  }, []);

  const restart = useCallback(() => {
    setSheet(null);
    setUndoStack([]);
    setElapsed(0);
    setVerdictOpen(false);
    setProgress(newProgress(caseRef));
  }, [caseRef]);

  const jumpTo = useCallback((suspect: Suspect) => {
    setSheet(null);
    setTab("file");
    setPage(suspect.page);
    setSpotlight(suspect.id);
  }, []);

  useEffect(() => {
    if (spotlight == null) return;
    const id = setTimeout(() => setSpotlight(null), 2600);
    return () => clearTimeout(id);
  }, [spotlight]);

  /* ---------------- render ---------------- */

  return (
    <div className="game">
      <header className="game-head">
        <button className="icon-button" onClick={onExit} aria-label="Leave the case">
          ←
        </button>
        <div className="game-head-title">
          <span className="case-code">{detectiveCase.code}</span>
          <span className="case-sub">
            {difficulty.label} · {plural(detectiveCase.clues.length, "clue")}
          </span>
        </div>
        <span className="clock" aria-label="Time on the case">
          {formatDuration(elapsed)}
        </span>
        <button className="icon-button" onClick={() => setSheet("menu")} aria-label="Case options">
          ⋯
        </button>
      </header>

      <nav className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "clues"}
          className={tab === "clues" ? "tab active" : "tab"}
          onClick={() => setTab("clues")}
        >
          Clues
          <span className="tab-count">
            {progress.checked.length}/{detectiveCase.clues.length}
          </span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "file"}
          className={tab === "file" ? "tab active" : "tab"}
          onClick={() => setTab("file")}
        >
          Casefile
          <span className="tab-count">{standing.toLocaleString()} left</span>
        </button>
      </nav>

      {tab === "clues" ? (
        <CluesPanel
          detectiveCase={detectiveCase}
          checked={progress.checked}
          assists={progress.assists}
          locked={progress.status !== "playing"}
          onToggle={toggleClue}
          onApply={applyClue}
        />
      ) : (
        <CasefilePanel
          detectiveCase={detectiveCase}
          eliminated={eliminated}
          page={page}
          spotlight={spotlight}
          revealed={progress.status !== "playing"}
          killerId={detectiveCase.killerId}
          onPage={setPage}
          onToggle={toggleSuspect}
          onUndo={undoStack.length > 0 ? undo : undefined}
          onSearch={() => setSheet("search")}
        />
      )}

      <footer className="game-foot">
        <span className="standing">
          <strong>{standing.toLocaleString()}</strong> still standing
        </span>
        {progress.status === "playing" ? (
          <button className="primary-button" onClick={() => setSheet("arrest")}>
            Make an arrest
          </button>
        ) : (
          <button className="primary-button" onClick={() => setVerdictOpen(true)}>
            See the verdict
          </button>
        )}
      </footer>

      {sheet === "arrest" && (
        <ArrestSheet
          detectiveCase={detectiveCase}
          eliminated={eliminated}
          attemptsLeft={MAX_ARRESTS - progress.wrongArrests}
          onArrest={arrest}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "search" && (
        <SearchSheet
          detectiveCase={detectiveCase}
          eliminated={eliminated}
          onSelect={jumpTo}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === "menu" && (
        <Sheet title="Case options" onClose={() => setSheet(null)}>
          <div className="menu-list">
            <button className="menu-item" onClick={onShowRules}>
              How to play
            </button>
            <button className="menu-item" onClick={restart}>
              Start this case over
            </button>
            <button
              className="menu-item danger"
              onClick={giveUp}
              disabled={progress.status !== "playing"}
            >
              Give up and name the killer
            </button>
            <button className="menu-item" onClick={onExit}>
              Back to the front desk
            </button>
          </div>
          <p className="menu-note">
            Wrong arrests left: {Math.max(0, MAX_ARRESTS - progress.wrongArrests)} · Case code{" "}
            {detectiveCase.code}
          </p>
        </Sheet>
      )}

      {progress.status !== "playing" && verdictOpen && (
        <VerdictOverlay
          detectiveCase={detectiveCase}
          killer={killer}
          solved={progress.status === "solved"}
          elapsedMs={elapsed}
          assists={progress.assists.length}
          wrongArrests={progress.wrongArrests}
          onNewCase={onOpenCase}
          onExit={onExit}
          onReviewFile={() => {
            setVerdictOpen(false);
            setTab("file");
            setPage(killer.page);
          }}
        />
      )}
    </div>
  );
}
