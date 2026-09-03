import { describe, expect, it } from "vitest";
import { generateCase } from "../generator";
import { NAME_POOL } from "../names";
import { DIFFICULTIES, PER_PAGE, type Clue, type DetectiveCase, type Suspect } from "../types";

const SEEDS = Array.from({ length: 25 }, (_, i) => `test-seed-${i}`);

function survivors(c: DetectiveCase, clues: Clue[] = c.clues): Suspect[] {
  return c.suspects.filter((s) => clues.every((clue) => clue.test(s)));
}

function keptBy(c: DetectiveCase, clue: Clue): string {
  return c.suspects
    .filter((s) => clue.test(s))
    .map((s) => s.id)
    .join(",");
}

describe("name pool", () => {
  it("holds only names a clue can talk about", () => {
    expect(NAME_POOL.length).toBeGreaterThan(500);
    for (const name of NAME_POOL) expect(name).toMatch(/^[A-Z][a-z]{1,8}$/);
  });

  it("has no duplicates", () => {
    expect(new Set(NAME_POOL).size).toBe(NAME_POOL.length);
  });
});

describe.each(DIFFICULTIES)("a $label case", (difficulty) => {
  const cases = SEEDS.map((seed) => generateCase(seed, difficulty.id));

  it("fills every page of the casefile", () => {
    for (const c of cases) {
      expect(c.suspects).toHaveLength(difficulty.pages * PER_PAGE);
      expect(c.pages).toBe(difficulty.pages);
      for (const [i, suspect] of c.suspects.entries()) {
        expect(suspect.id).toBe(i);
        expect(suspect.page).toBeGreaterThanOrEqual(1);
        expect(suspect.page).toBeLessThanOrEqual(c.pages);
        expect(suspect.row).toBeGreaterThanOrEqual(1);
        expect(suspect.row).toBeLessThanOrEqual(c.rows);
        expect(suspect.col).toBeGreaterThanOrEqual(1);
        expect(suspect.col).toBeLessThanOrEqual(c.cols);
      }
    }
  });

  it("is solvable: every clue is true of the killer, and only of the killer", () => {
    for (const c of cases) {
      const killer = c.suspects[c.killerId];
      for (const clue of c.clues) expect(clue.test(killer)).toBe(true);
      expect(survivors(c).map((s) => s.id)).toEqual([c.killerId]);
    }
  });

  it("never prints the same clue twice", () => {
    for (const c of cases) {
      const shapes = c.clues.map((clue) => keptBy(c, clue));
      expect(new Set(shapes).size).toBe(c.clues.length);
      expect(new Set(c.clues.map((clue) => clue.text)).size).toBe(c.clues.length);
    }
  });

  it("hands out no giveaway clue", () => {
    // No single clue may cut the casefile below a quarter of its names, which
    // puts a floor under how much work the player actually has to do.
    for (const c of cases) {
      for (const clue of c.clues) {
        expect(survivors(c, [clue]).length / c.suspects.length).toBeGreaterThanOrEqual(0.25);
      }
    }
  });

  it("cannot be cracked from three clues", () => {
    for (const c of cases) {
      for (let a = 0; a < c.clues.length; a++) {
        for (let b = a + 1; b < c.clues.length; b++) {
          for (let d = b + 1; d < c.clues.length; d++) {
            const trio = [c.clues[a], c.clues[b], c.clues[d]];
            expect(survivors(c, trio).length).toBeGreaterThan(1);
          }
        }
      }
    }
  });

  it("hands the player a clue list worth reading", () => {
    for (const c of cases) {
      expect(c.clues.length).toBeGreaterThanOrEqual(difficulty.targetClues - 2);
      expect(c.clues.length).toBeLessThanOrEqual(difficulty.targetClues + 3);
      expect(new Set(c.clues.map((clue) => clue.category)).size).toBeGreaterThanOrEqual(3);
    }
  });

  it("writes the case brief", () => {
    for (const c of cases) {
      expect(c.story.victim).toMatch(/^\S+ \S+$/);
      expect(c.story.client).toMatch(/^\S+ \S+$/);
      expect(c.story.victim).not.toBe(c.story.client);
      expect(c.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });
});

describe("determinism", () => {
  it("rebuilds an identical case from the same seed", () => {
    const a = generateCase("repeatable", "detective");
    const b = generateCase("repeatable", "detective");
    expect(b.killerId).toBe(a.killerId);
    expect(b.code).toBe(a.code);
    expect(b.suspects.map((s) => s.name)).toEqual(a.suspects.map((s) => s.name));
    expect(b.clues.map((c) => c.text)).toEqual(a.clues.map((c) => c.text));
  });

  it("gives different seeds different cases", () => {
    const a = generateCase("seed-a", "rookie");
    const b = generateCase("seed-b", "rookie");
    expect(b.clues.map((c) => c.text)).not.toEqual(a.clues.map((c) => c.text));
  });
});
