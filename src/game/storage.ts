import type { DifficultyId } from "./types";

const PROGRESS_PREFIX = "murder-mystery:case:v1:";
const CURRENT_KEY = "murder-mystery:current:v1";
const STATS_KEY = "murder-mystery:stats:v1";

export type CaseStatus = "playing" | "solved" | "failed";

export interface CaseProgress {
  seed: string;
  difficulty: DifficultyId;
  /** Suspect ids the player has crossed out. */
  eliminated: number[];
  /** Clue ids the player has ticked off. */
  checked: string[];
  /** Clue ids the player asked the app to apply for them. */
  assists: string[];
  elapsedMs: number;
  wrongArrests: number;
  status: CaseStatus;
  updatedAt: number;
}

export interface CaseRef {
  seed: string;
  difficulty: DifficultyId;
}

export interface Stats {
  played: number;
  solved: number;
  /** Fastest solve in ms, per difficulty. */
  best: Partial<Record<DifficultyId, number>>;
  /** Solves with no assists used. */
  unaided: number;
}

const EMPTY_STATS: Stats = { played: 0, solved: 0, best: {}, unaided: 0 };

function progressKey(ref: CaseRef): string {
  return `${PROGRESS_PREFIX}${ref.difficulty}:${ref.seed}`;
}

/** localStorage is unavailable in private modes and inside some webviews. */
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the game still plays, it just won't resume */
  }
}

export function loadProgress(ref: CaseRef): CaseProgress | null {
  return read<CaseProgress>(progressKey(ref));
}

export function saveProgress(progress: CaseProgress): void {
  write(progressKey(progress), { ...progress, updatedAt: Date.now() });
}

export function clearProgress(ref: CaseRef): void {
  try {
    localStorage.removeItem(progressKey(ref));
  } catch {
    /* ignore */
  }
}

export function loadCurrent(): CaseRef | null {
  return read<CaseRef>(CURRENT_KEY);
}

export function saveCurrent(ref: CaseRef | null): void {
  if (!ref) {
    try {
      localStorage.removeItem(CURRENT_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  write(CURRENT_KEY, ref);
}

export function loadStats(): Stats {
  return { ...EMPTY_STATS, ...(read<Stats>(STATS_KEY) ?? {}) };
}

export function recordOpened(): void {
  const stats = loadStats();
  write(STATS_KEY, { ...stats, played: stats.played + 1 });
}

export function recordSolved(difficulty: DifficultyId, elapsedMs: number, assists: number): void {
  const stats = loadStats();
  const previousBest = stats.best[difficulty];
  write(STATS_KEY, {
    ...stats,
    solved: stats.solved + 1,
    unaided: stats.unaided + (assists === 0 ? 1 : 0),
    best: {
      ...stats.best,
      [difficulty]: previousBest == null ? elapsedMs : Math.min(previousBest, elapsedMs),
    },
  });
}

export function newProgress(ref: CaseRef): CaseProgress {
  return {
    ...ref,
    eliminated: [],
    checked: [],
    assists: [],
    elapsedMs: 0,
    wrongArrests: 0,
    status: "playing",
    updatedAt: Date.now(),
  };
}
