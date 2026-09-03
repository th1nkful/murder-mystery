import { proposeClue } from "./clues";
import { NAME_POOL } from "./names";
import { caseCode, makeRng, pick, randInt, shuffle, type Rng } from "./rng";
import {
  PAGE_COLS,
  PAGE_ROWS,
  PER_PAGE,
  getDifficulty,
  type CaseContext,
  type CaseStory,
  type Clue,
  type DetectiveCase,
  type DifficultyId,
  type SceneId,
  type Suspect,
} from "./types";

/* ------------------------------------------------------------------ */
/* Casefile layout                                                     */
/* ------------------------------------------------------------------ */

/**
 * Fill `pages` pages with names, all of them different.
 *
 * The pool is larger than the biggest casefile, so no case has to repeat
 * itself: every suspect in a file is a distinct first name, and a name a clue
 * points at ("a later page than Floyd") can only mean one person.
 */
function buildSuspects(rng: Rng, pages: number): Suspect[] {
  const total = pages * PER_PAGE;
  const cast = shuffle(rng, NAME_POOL).slice(0, total);

  return cast.map((name, i) => ({
    id: i,
    name,
    page: Math.floor(i / PER_PAGE) + 1,
    row: Math.floor((i % PER_PAGE) / PAGE_COLS) + 1,
    col: (i % PAGE_COLS) + 1,
  }));
}

function buildContext(suspects: Suspect[], pages: number): CaseContext {
  return { suspects, pages, cols: PAGE_COLS, rows: PAGE_ROWS };
}

/* ------------------------------------------------------------------ */
/* Clue selection                                                      */
/* ------------------------------------------------------------------ */

const PROPOSALS_PER_STEP = 48;

/**
 * Above this many suspects still in play, a clue's strength is estimated from
 * a random sample rather than the whole list. Generating a case tries hundreds
 * of clues per step and the estimate only has to be good enough to rank them.
 */
const SAMPLE_LIMIT = 400;

/**
 * The most suspects a single clue may knock out of the suspects still in play,
 * as a fraction. Without this, one lucky clue does most of the work and the
 * case collapses into two or three steps. A clue that lands on the killer
 * outright is exempt — that is the last clue.
 */
const MIN_KEEP_RATIO = 0.42;

/**
 * The same floor measured against the whole casefile. A clue can be mild in
 * context and still be a giveaway on its own ("the name ends in X" cuts a file
 * to a handful), and a giveaway lets a player crack the case from two or three
 * clues without ever working the file.
 */
const GLOBAL_MIN_KEEP_RATIO = 0.25;

/** Nobody should be able to name the killer from this few clues. */
const UNCRACKABLE_SUBSET_SIZE = 3;

/**
 * Greedily choose clues that are all true of `target` until exactly one
 * suspect survives.
 *
 * Each step aims for a clue that keeps roughly `targetRatio` of the suspects
 * still in play, where `targetRatio` is the reduction needed to land on a
 * single name in the number of clues left in the budget. That keeps every clue
 * meaningful without any single clue giving the game away.
 */
function chooseClues(rng: Rng, ctx: CaseContext, target: Suspect, budget: number): Clue[] | null {
  const chosen: Clue[] = [];
  const chosenMasks: Uint32Array[] = [];
  const usedFamilies = new Set<string>();
  let remaining: Suspect[] = ctx.suspects;
  const hardCap = budget + 8;
  const globalFloor = Math.ceil(ctx.suspects.length * GLOBAL_MIN_KEEP_RATIO);

  while (remaining.length > 1 && chosen.length < hardCap) {
    const cluesLeft = Math.max(1, budget - chosen.length);
    const targetRatio = Math.pow(1 / remaining.length, 1 / cluesLeft);
    const probe =
      remaining.length > SAMPLE_LIMIT ? shuffle(rng, remaining).slice(0, SAMPLE_LIMIT) : remaining;

    /** Draw a shortlist of usable clues, ranked by how close they land to the target strength. */
    const shortlist = (exclude: ReadonlySet<string>) => {
      const ranked: { clue: Clue; family: string; score: number }[] = [];
      for (let i = 0; i < PROPOSALS_PER_STEP; i++) {
        const proposal = proposeClue(rng, ctx, target, exclude);
        if (!proposal) continue;
        let survives = 0;
        for (const s of probe) if (proposal.clue.test(s)) survives++;
        if (survives === probe.length) continue; // eliminates nobody
        const ratio = survives / probe.length;
        const finisher = probe === remaining && survives === 1;
        if (!finisher && ratio < MIN_KEEP_RATIO) continue; // too decisive on its own
        const score = finisher && cluesLeft <= 1 ? -1 : Math.abs(ratio - targetRatio);
        ranked.push({ ...proposal, score });
      }
      return ranked.sort((a, b) => a.score - b.score);
    };

    // Prefer a family the case hasn't used yet, but never stall on it: some
    // families ("starts and ends with the same letter") simply don't apply to
    // every killer, and the case still has to reach a single name.
    const passes: ReadonlySet<string>[] =
      usedFamilies.size > 0 ? [usedFamilies, new Set()] : [new Set()];

    let applied = false;
    for (const exclude of passes) {
      // Building the full-casefile mask is the expensive part of vetting a
      // clue, so only the front-runners pay for it.
      for (const candidate of shortlist(exclude)) {
        const mask = maskOf(ctx, candidate.clue);
        if (popcount(mask) < globalFloor) continue;
        if (implied(mask, chosenMasks)) continue;
        const kept = remaining.filter(candidate.clue.test);
        if (kept.length === 0 || kept.length === remaining.length) continue;
        chosen.push(candidate.clue);
        chosenMasks.push(mask);
        usedFamilies.add(candidate.family);
        remaining = kept;
        applied = true;
        break;
      }
      if (applied) break;
    }
    if (!applied) return null;
  }

  return remaining.length === 1 && remaining[0].id === target.id ? chosen : null;
}

/** Which suspects a clue keeps, packed one bit per suspect — cheap to compare. */
function maskOf(ctx: CaseContext, clue: Clue): Uint32Array {
  const mask = new Uint32Array(Math.ceil(ctx.suspects.length / 32));
  for (let i = 0; i < ctx.suspects.length; i++) {
    if (clue.test(ctx.suspects[i])) mask[i >>> 5] |= 1 << (i & 31);
  }
  return mask;
}

function popcount(mask: Uint32Array): number {
  let total = 0;
  for (let i = 0; i < mask.length; i++) {
    let v = mask[i];
    v = v - ((v >>> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    total += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
  return total;
}

/**
 * True when the candidate says nothing new next to a clue already chosen:
 * either it keeps a subset of that clue's suspects, or a superset of them.
 * Both read to a player as the same clue printed twice.
 */
function implied(mask: Uint32Array, chosenMasks: Uint32Array[]): boolean {
  for (const other of chosenMasks) {
    let subset = true;
    let superset = true;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] & ~other[i]) subset = false;
      if (other[i] & ~mask[i]) superset = false;
      if (!subset && !superset) break;
    }
    if (subset || superset) return true;
  }
  return false;
}

function survivorsOf(suspects: Suspect[], clues: Clue[]): Suspect[] {
  return suspects.filter((s) => clues.every((c) => c.test(s)));
}

/**
 * True when some group of `size` clues already names the killer by itself.
 * Such a case reads as a long list of clues but is over the moment the player
 * happens to apply the right three, so it is thrown away and rebuilt.
 */
function crackableBy(suspects: Suspect[], clues: Clue[], size: number): boolean {
  const combo: Clue[] = [];
  const walk = (start: number): boolean => {
    if (combo.length === size) return survivorsOf(suspects, combo).length === 1;
    for (let i = start; i < clues.length; i++) {
      combo.push(clues[i]);
      const cracked = walk(i + 1);
      combo.pop();
      if (cracked) return true;
    }
    return false;
  };
  return clues.length > size && walk(0);
}

/**
 * Drop clues the rest of the list already implies, so the case does not ship
 * with padding — but stop at `floor` clues, because a fully minimal list ends
 * up shorter than the difficulty promises.
 */
function pruneClues(rng: Rng, ctx: CaseContext, clues: Clue[], floor: number): Clue[] {
  let kept = clues.slice();
  for (const candidate of shuffle(rng, clues)) {
    if (kept.length <= floor) break;
    const without = kept.filter((c) => c !== candidate);
    if (survivorsOf(ctx.suspects, without).length === 1) kept = without;
  }
  return kept;
}

/* ------------------------------------------------------------------ */
/* Story dressing                                                      */
/* ------------------------------------------------------------------ */

const SURNAMES = [
  "Starling", "Vance", "Ashcroft", "Bellweather", "Crane", "Duvall", "Fairweather",
  "Grimsby", "Hollis", "Ingram", "Kestrel", "Lockhart", "Marchetti", "Northcote",
  "Ovenden", "Pemberton", "Quill", "Rathbone", "Sinclair", "Thorne", "Underhill",
  "Vasquez", "Winterbourne", "Ashby", "Blackwood", "Corvina", "Delacroix", "Everly",
];

const LOCATIONS: { scene: SceneId; label: string }[] = [
  { scene: "hotel", label: "the Brackwater Hotel" },
  { scene: "flat", label: "a locked flat on Sable Row" },
  { scene: "pier", label: "the old Pier Ballroom" },
  { scene: "library", label: "the Ravenscourt Library" },
  { scene: "theatre", label: "a dressing room at the Gaslight Theatre" },
  { scene: "ferry", label: "the night ferry to Kellsholm" },
  { scene: "observatory", label: "the Harlow Street observatory" },
  { scene: "viaduct", label: "a lock-up beneath the viaduct" },
  { scene: "greenhouse", label: "the greenhouse at Wilder House" },
  { scene: "train", label: "the last carriage of the 11:40 train" },
];

/** Clipped to the front of the folder, in the hand of whoever worked the scene. */
const NOTES = [
  "Whoever did this signed their name in the room. Not on paper — in the details.",
  "No prints, no weapon, no witness worth the paper. Only what has to be true of them.",
  "Everyone in the building that night is in here, and not one soul more. Check it twice.",
  "Fourteen hours of canvassing comes to this: a roll of names and a handful of facts.",
  "The room gave up more than the living did. It is all written down. Work it through.",
  "They are still on this list. Nobody left the building before we sealed it.",
];

function buildStory(rng: Rng): CaseStory {
  const location = pick(rng, LOCATIONS);
  return {
    victim: `${pick(rng, NAME_POOL)} ${pick(rng, SURNAMES)}`,
    scene: location.scene,
    location: location.label,
    note: pick(rng, NOTES),
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build a complete, solvable case from a seed. The same seed always produces
 * the same case, which is why only the seed is ever persisted.
 */
export function generateCase(seed: string, difficultyId: DifficultyId): DetectiveCase {
  const difficulty = getDifficulty(difficultyId);
  const rng = makeRng(`${seed}:${difficultyId}`);
  const suspects = buildSuspects(rng, difficulty.pages);
  const ctx = buildContext(suspects, difficulty.pages);
  const story = buildStory(rng);

  // Pruning always trims a few clues, so aim past the target and keep the
  // cases that land on a clue list worth reading.
  const budget = difficulty.targetClues + 3;
  const minClues = difficulty.targetClues - 2;
  let fallback: DetectiveCase | null = null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const target = suspects[randInt(rng, 0, suspects.length - 1)];
    const raw = chooseClues(rng, ctx, target, budget);
    if (!raw) continue;

    const pruned = pruneClues(rng, ctx, raw, difficulty.targetClues);
    const survivors = survivorsOf(suspects, pruned);
    if (survivors.length !== 1 || survivors[0].id !== target.id) continue;
    if (crackableBy(suspects, pruned, UNCRACKABLE_SUBSET_SIZE)) continue;

    const clues = shuffle(rng, pruned).map((c, i) => ({ ...c, id: `clue-${i + 1}` }));
    const built: DetectiveCase = {
      seed,
      code: caseCode(`${seed}:${difficultyId}`),
      difficulty: difficultyId,
      suspects,
      pages: difficulty.pages,
      cols: PAGE_COLS,
      rows: PAGE_ROWS,
      clues,
      killerId: target.id,
      story,
    };
    if (clues.length >= minClues) return built;
    if (!fallback || clues.length > fallback.clues.length) fallback = built;
  }

  if (fallback) return fallback;
  throw new Error(`Could not build a case for seed "${seed}"`);
}

export function todaySeed(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `daily-${y}-${m}-${d}`;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
