import type { CaseContext, Clue, Suspect } from "./types";
import { pick, randInt, type Rng } from "./rng";

/* ------------------------------------------------------------------ */
/* Word helpers — every clue must be checkable by eye, no trick rules. */
/* ------------------------------------------------------------------ */

const VOWELS = "AEIOU";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

function word(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function isVowel(ch: string): boolean {
  return VOWELS.includes(ch);
}

/** Everything a clue needs to know about a name. */
interface NameInfo {
  /** Upper-cased name. */
  u: string;
  length: number;
  first: string;
  last: string;
  firstIsVowel: boolean;
  secondIsVowel: boolean;
  lastIsVowel: boolean;
  vowels: number;
  /** The same letter twice in a row, like Emma. */
  double: boolean;
  /** Any letter used more than once, adjacent or not, like Anna or Alan. */
  repeat: boolean;
}

/**
 * Generating a case runs clue predicates hundreds of thousands of times over a
 * pool of at most a few hundred distinct names, so each name is analysed once.
 */
const infoCache = new Map<string, NameInfo>();

function analyse(name: string): NameInfo {
  const cached = infoCache.get(name);
  if (cached) return cached;

  const u = name.toUpperCase();
  let vowels = 0;
  let double = false;
  for (let i = 0; i < u.length; i++) {
    if (isVowel(u[i])) vowels++;
    if (i > 0 && u[i] === u[i - 1]) double = true;
  }
  const info: NameInfo = {
    u,
    length: u.length,
    first: u[0],
    last: u[u.length - 1],
    firstIsVowel: isVowel(u[0]),
    secondIsVowel: u.length > 1 && isVowel(u[1]),
    lastIsVowel: isVowel(u[u.length - 1]),
    vowels,
    double,
    repeat: new Set(u).size !== u.length,
  };
  infoCache.set(name, info);
  return info;
}

function vowelCount(name: string): number {
  return analyse(name).vowels;
}

function hasDoubleLetter(name: string): boolean {
  return analyse(name).double;
}

function hasRepeatedLetter(name: string): boolean {
  return analyse(name).repeat;
}

/* ------------------------------------------------------------------ */
/* Clue factories                                                      */
/* ------------------------------------------------------------------ */

type Factory = (rng: Rng, ctx: CaseContext, target: Suspect) => Clue | null;

let clueCounter = 0;
function clue(
  category: Clue["category"],
  text: string,
  test: (s: Suspect) => boolean,
): Clue {
  return { id: `c${clueCounter++}`, category, text, test };
}

/**
 * Factories are grouped into families. Two clues from the same family talk
 * about the same property of the killer ("top half of the page" and "in the
 * top five rows" are the same statement twice), so the generator takes at most
 * one clue per family until it runs out of families.
 */
interface Rule {
  key: string;
  family: string;
  make: Factory;
}

const rules: Rule[] = [
  /* ---------------- spelling ---------------- */
  {
    key: "length-bound",
    family: "length",
    make: (rng, _ctx, target) => {
      const len = analyse(target.name).length;
      if (rng() < 0.5) {
        const n = len - randInt(rng, 1, 3);
        if (n < 2) return null;
        return clue(
          "spelling",
          `The killer's name is *longer than ${word(n)} letters*.`,
          (s) => s.name.length > n,
        );
      }
      const n = len + randInt(rng, 1, 3);
      if (n > 10) return null;
      return clue(
        "spelling",
        `The killer's name is *shorter than ${word(n)} letters*.`,
        (s) => s.name.length < n,
      );
    },
  },
  {
    key: "length-parity",
    family: "length",
    make: (_rng, _ctx, target) => {
      const even = target.name.length % 2 === 0;
      return clue(
        "spelling",
        `The killer's name has an *${even ? "even" : "odd"} number of letters*.`,
        (s) => (s.name.length % 2 === 0) === even,
      );
    },
  },
  {
    key: "length-exact",
    family: "length",
    make: (_rng, _ctx, target) => {
      const len = target.name.length;
      return clue(
        "spelling",
        `The killer's name is *exactly ${word(len)} letters* long.`,
        (s) => s.name.length === len,
      );
    },
  },
  /* ---------------- initials ---------------- */
  {
    key: "initial-half",
    family: "initial",
    make: (_rng, _ctx, target) => {
      const first = analyse(target.name).first;
      const early = first <= "M";
      return clue(
        "letters",
        early
          ? "The killer's initial falls in the *first half of the alphabet (A–M)*."
          : "The killer's initial falls in the *second half of the alphabet (N–Z)*.",
        (s) => (analyse(s.name).first <= "M") === early,
      );
    },
  },
  {
    key: "initial-not",
    family: "initial",
    make: (rng, _ctx, target) => {
      const first = analyse(target.name).first;
      for (let attempt = 0; attempt < 8; attempt++) {
        const letter = pick(rng, ALPHABET.split(""));
        if (letter === first) continue;
        return clue(
          "letters",
          `The killer's name does *not start with ${letter}*.`,
          (s) => analyse(s.name).first !== letter,
        );
      }
      return null;
    },
  },
  {
    key: "initial-set",
    family: "initial",
    make: (rng, _ctx, target) => {
      const first = analyse(target.name).first;
      const others = ALPHABET.split("").filter((l) => l !== first);
      const set = new Set<string>([first]);
      const size = randInt(rng, 4, 7);
      while (set.size < size) set.add(pick(rng, others));
      const letters = Array.from(set).sort();
      const list = `${letters.slice(0, -1).join(", ")} or ${letters[letters.length - 1]}`;
      return clue(
        "letters",
        `The killer's name *starts with ${list}*.`,
        (s) => set.has(analyse(s.name).first),
      );
    },
  },
  {
    key: "initial-vowel",
    family: "initial",
    make: (_rng, _ctx, target) => {
      const yes = analyse(target.name).firstIsVowel;
      return clue(
        "letters",
        yes
          ? "The killer's name *starts with a vowel*."
          : "The killer's name does *not start with a vowel*.",
        (s) => analyse(s.name).firstIsVowel === yes,
      );
    },
  },
  /* ---------------- vowels & letters ---------------- */
  {
    key: "vowel-count",
    family: "vowels",
    make: (rng, _ctx, target) => {
      const count = vowelCount(target.name);
      if (rng() < 0.55) {
        const n = Math.max(1, count - randInt(rng, 0, 1));
        return clue(
          "letters",
          `The killer's name contains *at least ${word(n)} vowels*.`,
          (s) => analyse(s.name).vowels >= n,
        );
      }
      const n = count + randInt(rng, 1, 2);
      if (n > 6) return null;
      return clue(
        "letters",
        `The killer's name contains *fewer than ${word(n)} vowels*.`,
        (s) => analyse(s.name).vowels < n,
      );
    },
  },
  {
    key: "contains-letter",
    family: "contains",
    make: (rng, _ctx, target) => {
      const u = analyse(target.name).u;
      if (rng() < 0.5) {
        const letter = pick(rng, Array.from(new Set(u.slice(1))));
        if (!letter) return null;
        return clue(
          "letters",
          `The killer's name *contains the letter ${letter}*.`,
          (s) => analyse(s.name).u.includes(letter),
        );
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        const letter = pick(rng, ALPHABET.split(""));
        if (u.includes(letter)) continue;
        return clue(
          "letters",
          `The killer's name *does not contain the letter ${letter}*.`,
          (s) => !analyse(s.name).u.includes(letter),
        );
      }
      return null;
    },
  },
  {
    key: "double-letter",
    family: "repeat",
    make: (_rng, _ctx, target) => {
      const yes = hasDoubleLetter(target.name);
      return clue(
        "spelling",
        yes
          ? "The killer's name *contains a double letter* — the same letter twice in a row, like Emma or Harry."
          : "The killer's name does *not contain a double letter* — no letter appears twice in a row, so no Emma, no Harry.",
        (s) => analyse(s.name).double === yes,
      );
    },
  },
  {
    key: "repeated-letter",
    family: "repeat",
    make: (_rng, _ctx, target) => {
      const yes = hasRepeatedLetter(target.name);
      return clue(
        "spelling",
        yes
          ? "*Some letter appears more than once* in the killer's name, in a row or not."
          : "*Every letter in the killer's name is different* — nothing is used twice.",
        (s) => analyse(s.name).repeat === yes,
      );
    },
  },
  {
    key: "ends-vowel",
    family: "ends",
    make: (_rng, _ctx, target) => {
      const yes = analyse(target.name).lastIsVowel;
      return clue(
        "spelling",
        yes ? "The killer's name *ends in a vowel*." : "The killer's name *ends in a consonant*.",
        (s) => analyse(s.name).lastIsVowel === yes,
      );
    },
  },
  {
    key: "ends-letter",
    family: "ends",
    make: (_rng, _ctx, target) => {
      const last = analyse(target.name).last;
      return clue(
        "spelling",
        `The killer's name *ends with the letter ${last}*.`,
        (s) => analyse(s.name).last === last,
      );
    },
  },
  {
    key: "second-letter",
    family: "second",
    make: (_rng, _ctx, target) => {
      const info = analyse(target.name);
      if (info.length < 2) return null;
      const yes = info.secondIsVowel;
      return clue(
        "spelling",
        `The *second letter* of the killer's name is a *${yes ? "vowel" : "consonant"}*.`,
        (s) => {
          const t = analyse(s.name);
          return t.length >= 2 && t.secondIsVowel === yes;
        },
      );
    },
  },
  {
    key: "book-ends",
    family: "bookends",
    make: (_rng, _ctx, target) => {
      const info = analyse(target.name);
      if (info.first !== info.last) return null;
      return clue(
        "spelling",
        "The killer's name *starts and ends with the same letter*.",
        (s) => {
          const t = analyse(s.name);
          return t.first === t.last;
        },
      );
    },
  },
  {
    key: "bigram",
    family: "contains",
    make: (rng, _ctx, target) => {
      const u = analyse(target.name).u;
      if (u.length < 3) return null;
      const i = randInt(rng, 0, u.length - 2);
      const pair = u.slice(i, i + 2);
      if (pair[0] === pair[1]) return null;
      return clue(
        "letters",
        `Somewhere in the killer's name, the letters *${pair[0]} and ${pair[1]} sit side by side*, in that order.`,
        (s) => analyse(s.name).u.includes(pair),
      );
    },
  },
  {
    key: "alphabetical",
    family: "alpha",
    make: (rng, ctx, target) => {
      const reference = pick(rng, ctx.suspects).name;
      const refUpper = analyse(reference).u;
      const targetUpper = analyse(target.name).u;
      if (targetUpper === refUpper) return null;
      const after = targetUpper > refUpper;
      return clue(
        "letters",
        after
          ? `In an alphabetical list, the killer's name would come *after ${reference}*.`
          : `In an alphabetical list, the killer's name would come *before ${reference}*.`,
        (s) => (analyse(s.name).u > refUpper) === after,
      );
    },
  },
  /* ---------------- the casefile itself ---------------- */
  {
    key: "name-frequency",
    family: "frequency",
    make: (_rng, ctx, target) => {
      const once = (ctx.nameCounts.get(target.name) ?? 0) === 1;
      return clue(
        "file",
        once
          ? "The killer's name appears *only once* in the whole casefile."
          : "The killer's name appears *more than once* in the casefile — they share it with at least one other suspect.",
        (s) => ((ctx.nameCounts.get(s.name) ?? 0) === 1) === once,
      );
    },
  },
  /* ---------------- pages ---------------- */
  {
    key: "page-parity",
    family: "page-arith",
    make: (_rng, _ctx, target) => {
      const even = target.page % 2 === 0;
      return clue(
        "page",
        `The killer is on an *${even ? "even" : "odd"}-numbered page*.`,
        (s) => (s.page % 2 === 0) === even,
      );
    },
  },
  {
    key: "page-bound",
    family: "page-range",
    make: (rng, ctx, target) => {
      if (rng() < 0.5) {
        const n = randInt(rng, 1, target.page - 1);
        if (n < 1) return null;
        return clue("page", `The killer is on a page *after page ${n}*.`, (s) => s.page > n);
      }
      const n = randInt(rng, target.page + 1, ctx.pages);
      if (n > ctx.pages) return null;
      return clue("page", `The killer is on a page *before page ${n}*.`, (s) => s.page < n);
    },
  },
  {
    key: "page-multiple",
    family: "page-arith",
    make: (rng, _ctx, target) => {
      const factor = pick(rng, [3, 4, 5]);
      const yes = target.page % factor === 0;
      return clue(
        "page",
        yes
          ? `The killer's page number *divides exactly by ${factor}*.`
          : `The killer's page number *does not divide exactly by ${factor}*.`,
        (s) => (s.page % factor === 0) === yes,
      );
    },
  },
  {
    key: "page-vs-name",
    family: "page-range",
    make: (rng, ctx, target) => {
      const refs = ctx.uniqueNamed.filter((s) => s.page !== target.page);
      if (refs.length === 0) return null;
      const ref = pick(rng, refs);
      const later = target.page > ref.page;
      return clue(
        "page",
        later
          ? `The killer is on a *later page than ${ref.name}*.`
          : `The killer is on an *earlier page than ${ref.name}*.`,
        (s) => (s.page > ref.page) === later,
      );
    },
  },
  {
    key: "page-between-names",
    family: "page-range",
    make: (rng, ctx, target) => {
      const before = ctx.uniqueNamed.filter((s) => s.page < target.page);
      const after = ctx.uniqueNamed.filter((s) => s.page > target.page);
      if (before.length === 0 || after.length === 0) return null;
      const lo = pick(rng, before);
      const hi = pick(rng, after);
      return clue(
        "page",
        `The killer's page sits *somewhere between ${lo.name}'s page and ${hi.name}'s page*.`,
        (s) => s.page > lo.page && s.page < hi.page,
      );
    },
  },
  {
    key: "shares-page",
    family: "page-same",
    make: (rng, ctx, target) => {
      const refs = ctx.uniqueNamed.filter((s) => s.page === target.page && s.id !== target.id);
      if (refs.length === 0) return null;
      const ref = pick(rng, refs);
      return clue(
        "page",
        `The killer is on the *same page as ${ref.name}*.`,
        (s) => s.page === ref.page,
      );
    },
  },
  /* ---------------- position on the page ---------------- */
  {
    key: "col-half",
    family: "column",
    make: (_rng, ctx, target) => {
      const left = target.col <= ctx.cols / 2;
      return clue(
        "position",
        `The killer's name is in the *${left ? "left" : "right"} half of their page*.`,
        (s) => (s.col <= ctx.cols / 2) === left,
      );
    },
  },
  {
    key: "col-exact",
    family: "column",
    make: (_rng, _ctx, target) => {
      const col = target.col;
      return clue(
        "position",
        `The killer's name sits in *column ${col}* of their page.`,
        (s) => s.col === col,
      );
    },
  },
  {
    key: "col-parity",
    family: "column",
    make: (_rng, _ctx, target) => {
      const even = target.col % 2 === 0;
      return clue(
        "position",
        `The killer's name is in an *${even ? "even" : "odd"}-numbered column*.`,
        (s) => (s.col % 2 === 0) === even,
      );
    },
  },
  {
    key: "row-half",
    family: "row",
    make: (_rng, ctx, target) => {
      const top = target.row <= ctx.rows / 2;
      return clue(
        "position",
        `The killer's name is in the *${top ? "top" : "bottom"} half of their page*.`,
        (s) => (s.row <= ctx.rows / 2) === top,
      );
    },
  },
  {
    key: "row-bound",
    family: "row",
    make: (rng, ctx, target) => {
      if (rng() < 0.5) {
        const n = randInt(rng, target.row, ctx.rows - 1);
        return clue(
          "position",
          `The killer's name is in the *top ${word(n)} rows* of their page.`,
          (s) => s.row <= n,
        );
      }
      const n = randInt(rng, 2, target.row);
      return clue(
        "position",
        `The killer's name is on *row ${word(n)} or below*.`,
        (s) => s.row >= n,
      );
    },
  },
  {
    key: "row-parity",
    family: "row",
    make: (_rng, _ctx, target) => {
      const even = target.row % 2 === 0;
      return clue(
        "position",
        `The killer's name is on an *${even ? "even" : "odd"}-numbered row*.`,
        (s) => (s.row % 2 === 0) === even,
      );
    },
  },
];

/** Build one random, true-of-the-target clue. Returns null if the rule doesn't fit. */
export function proposeClue(
  rng: Rng,
  ctx: CaseContext,
  target: Suspect,
  excludeFamilies: ReadonlySet<string>,
): { family: string; clue: Clue } | null {
  const available = rules.filter((r) => !excludeFamilies.has(r.family));
  if (available.length === 0) return null;
  const rule = pick(rng, available);
  const made = rule.make(rng, ctx, target);
  if (!made) return null;
  // A clue that isn't true of the killer is worthless — guard against rule bugs.
  if (!made.test(target)) return null;
  return { family: rule.family, clue: made };
}
