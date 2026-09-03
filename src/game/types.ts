export interface Suspect {
  /** Index into the casefile, stable for a given seed. */
  id: number;
  name: string;
  /** 1-based page number. */
  page: number;
  /** 1-based row within the page. */
  row: number;
  /** 1-based column within the page. */
  col: number;
}

export type ClueCategory = "spelling" | "letters" | "page" | "position";

export interface Clue {
  /** Stable within a case; used as a React key and for progress storage. */
  id: string;
  /** Clue copy. Text wrapped in *asterisks* is rendered as highlighted. */
  text: string;
  category: ClueCategory;
  /** True for suspects the clue keeps in play. */
  test: (suspect: Suspect) => boolean;
}

export interface CaseContext {
  suspects: Suspect[];
  pages: number;
  cols: number;
  rows: number;
}

export interface DetectiveCase {
  seed: string;
  code: string;
  difficulty: DifficultyId;
  suspects: Suspect[];
  pages: number;
  cols: number;
  rows: number;
  clues: Clue[];
  killerId: number;
  story: CaseStory;
}

export interface CaseStory {
  victim: string;
  client: string;
  /** Which scene illustration to draw. */
  scene: SceneId;
  location: string;
  note: string;
}

export type SceneId =
  | "hotel"
  | "flat"
  | "pier"
  | "library"
  | "theatre"
  | "ferry"
  | "observatory"
  | "viaduct"
  | "greenhouse"
  | "train";

export type DifficultyId = "rookie" | "detective" | "inspector";

export interface Difficulty {
  id: DifficultyId;
  label: string;
  blurb: string;
  pages: number;
  /** Roughly how many clues the generator aims for. */
  targetClues: number;
}

/** How many clues a locked file shows before the player has to earn the rest. */
export const STARTING_CLUES = 3;

export const PAGE_COLS = 4;
export const PAGE_ROWS = 10;
export const PER_PAGE = PAGE_COLS * PAGE_ROWS;

export const DIFFICULTIES: Difficulty[] = [
  {
    id: "rookie",
    label: "Rookie",
    blurb: "6 pages · 240 suspects",
    pages: 6,
    targetClues: 8,
  },
  {
    id: "detective",
    label: "Detective",
    blurb: "18 pages · 720 suspects",
    pages: 18,
    targetClues: 11,
  },
  {
    id: "inspector",
    label: "Inspector",
    blurb: "36 pages · 1,440 suspects",
    pages: 36,
    targetClues: 14,
  },
];

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}
