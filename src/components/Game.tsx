import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateCase } from "../game/generator";
import { getDifficulty, type Clue, type Suspect } from "../game/types";
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
import CasePanel from "./CasePanel";
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
  /** Only applies to a case with no saved progress; a resumed case keeps its own mode. */
  lockedByDefault: boolean;
  onExit: () => void;
  onOpenCase: (ref: CaseRef, locked?: boolean) => void;
  onShowRules: () => void;
}

type SheetKind = "arrest" | "search" | "menu" | null;
type Tab = "case" | "clues" | "file";

function progressStatus(caseRef: CaseRef) {
  return loadProgress(caseRef)?.status ?? "playing";
}

export default function Game({
  caseRef,
  lockedByDefault,
  onExit,
  onOpenCase,
  onShowRules,
}: Props) {
  const detectiveCase = useMemo(
    () => generateCase(caseRef.seed, caseRef.difficulty),
    [caseRef.seed, caseRef.difficulty],
  );
  const difficulty = getDifficulty(caseRef.difficulty);

  const [progress, setProgress] = useState<CaseProgress>(
    () => loadProgress(caseRef) ?? newProgress(caseRef, lockedByDefault),
  );
  const [elapsed, setElapsed] = useState(progress.elapsedMs);
  const [tab, setTab] = useState<Tab>("case");
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [spotlight, setSpotlight] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<number[][]>([]);
  const [verdictOpen, setVerdictOpen] = useState(() => progressStatus(caseRef) !== "playing");

  const eliminated = useMemo(() => new Set(progress.eliminated), [progress.eliminated]);
  const standing = detectiveCase.suspects.length - eliminated.size;
  const killer = detectiveCase.suspects[detectiveCase.killerId];

  /**
   * In a locked file the next clue is earned: it opens once the player has
   * ruled out everyone the clues they already hold can rule out. Counting
   * survivors of the revealed clues gives that target directly.
   */
  const survivorsOfRevealed = useCallback(
    (count: number) => {
      const revealedClues = detectiveCase.clues.slice(0, count);
      return detectiveCase.suspects.filter((s: Suspect) =>
        revealedClues.every((c: Clue) => c.test(s)),
      ).length;
    },
    [detectiveCase],
  );

  const unlockAt = useMemo(
    () =>
      progress.locked && progress.revealed < detectiveCase.clues.length
        ? survivorsOfRevealed(progress.revealed)
        : null,
    [progress.locked, progress.revealed, detectiveCase.clues.length, survivorsOfRevealed],
  );

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

  /**
   * Every change to the crossed-out names runs through here, so a locked file
   * opens the next clue the moment it is earned. Unlocking is sticky: once a
   * clue is out of the envelope it stays out, even if names are put back.
   */
  const commit = useCallback(
    (change: (p: CaseProgress) => CaseProgress) => {
      setProgress((previous) => {
        const next = change(previous);
        if (!next.locked || next.status !== "playing") return next;
        let revealed = next.revealed;
        const stillStanding = detectiveCase.suspects.length - next.eliminated.length;
        while (
          revealed < detectiveCase.clues.length &&
          stillStanding <= survivorsOfRevealed(revealed)
        ) {
          revealed++;
        }
        return revealed === next.revealed ? next : { ...next, revealed };
      });
    },
    [detectiveCase, survivorsOfRevealed],
  );

  const pushUndo = useCallback(() => {
    setUndoStack((stack) => [...stack.slice(-19), progress.eliminated]);
  }, [progress.eliminated]);

  const toggleSuspect = useCallback(
    (id: number) => {
      commit((p) => {
        if (p.status !== "playing") return p;
        const has = p.eliminated.includes(id);
        return {
          ...p,
          eliminated: has ? p.eliminated.filter((x) => x !== id) : [...p.eliminated, id],
        };
      });
    },
    [commit],
  );

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
      commit((p) => {
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
    [detectiveCase, pushUndo, commit],
  );

  const crossOutPage = useCallback(
    (page: number) => {
      pushUndo();
      commit((p) => {
        if (p.status !== "playing") return p;
        const next = new Set(p.eliminated);
        for (const suspect of detectiveCase.suspects) {
          if (suspect.page === page) next.add(suspect.id);
        }
        return { ...p, eliminated: [...next] };
      });
    },
    [detectiveCase.suspects, pushUndo, commit],
  );

  const restorePage = useCallback(
    (page: number) => {
      pushUndo();
      commit((p) => {
        if (p.status !== "playing") return p;
        const onPage = new Set(
          detectiveCase.suspects.filter((s) => s.page === page).map((s) => s.id),
        );
        return { ...p, eliminated: p.eliminated.filter((id) => !onPage.has(id)) };
      });
    },
    [detectiveCase.suspects, pushUndo, commit],
  );

  /**
   * Strike a whole row or column of a page — or put it back, if every name in
   * it is already struck.
   */
  const toggleGroup = useCallback(
    (matches: (suspect: Suspect) => boolean) => {
      pushUndo();
      commit((p) => {
        if (p.status !== "playing") return p;
        const group = detectiveCase.suspects.filter(matches);
        if (group.length === 0) return p;
        const next = new Set(p.eliminated);
        const allStruck = group.every((suspect) => next.has(suspect.id));
        for (const suspect of group) {
          if (allStruck) next.delete(suspect.id);
          else next.add(suspect.id);
        }
        return { ...p, eliminated: [...next] };
      });
    },
    [detectiveCase.suspects, pushUndo, commit],
  );

  const toggleRow = useCallback(
    (pageNumber: number, row: number) =>
      toggleGroup((s) => s.page === pageNumber && s.row === row),
    [toggleGroup],
  );

  const toggleColumn = useCallback(
    (pageNumber: number, col: number) =>
      toggleGroup((s) => s.page === pageNumber && s.col === col),
    [toggleGroup],
  );

  const undo = useCallback(() => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack((stack) => stack.slice(0, -1));
    commit((p) => ({ ...p, eliminated: previous }));
  }, [undoStack, commit]);

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
    setProgress(newProgress(caseRef, progress.locked));
  }, [caseRef, progress.locked]);

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

      <div className="game-status">
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
      </div>

      {tab === "case" && (
        <CasePanel
          detectiveCase={detectiveCase}
          locked={progress.locked}
          standing={standing}
          onOpenClues={() => setTab("clues")}
        />
      )}

      {tab === "clues" && (
        <CluesPanel
          detectiveCase={detectiveCase}
          checked={progress.checked}
          assists={progress.assists}
          locked={progress.locked}
          revealed={progress.revealed}
          standing={standing}
          unlockAt={unlockAt}
          disabled={progress.status !== "playing"}
          onToggle={toggleClue}
          onApply={applyClue}
        />
      )}

      {tab === "file" && (
        <CasefilePanel
          detectiveCase={detectiveCase}
          eliminated={eliminated}
          page={page}
          spotlight={spotlight}
          revealed={progress.status !== "playing"}
          killerId={detectiveCase.killerId}
          onPage={setPage}
          onToggle={toggleSuspect}
          onCrossOutPage={crossOutPage}
          onRestorePage={restorePage}
          onToggleRow={toggleRow}
          onToggleColumn={toggleColumn}
          onUndo={undoStack.length > 0 ? undo : undefined}
          onSearch={() => setSheet("search")}
        />
      )}

      <nav className="tabs" role="tablist">
        {(
          [
            ["case", "Case", "the brief"],
            [
              "clues",
              "Clues",
              progress.locked
                ? `${Math.min(progress.revealed, detectiveCase.clues.length)} of ${detectiveCase.clues.length} open`
                : `${progress.checked.length}/${detectiveCase.clues.length}`,
            ],
            ["file", "Suspects", `${standing.toLocaleString()} left`],
          ] as const
        ).map(([id, label, meta]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "tab active" : "tab"}
            onClick={() => setTab(id)}
          >
            {label}
            <span className="tab-count">{meta}</span>
          </button>
        ))}
      </nav>

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
          onNewCase={(ref) => onOpenCase(ref, progress.locked)}
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
