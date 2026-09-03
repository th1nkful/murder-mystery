# Find the Murderer

A text-based deduction game for the phone. You get a casefile of hundreds of
suspects and a list of clues, every one of them true of the killer. Cross out
everyone the clues rule out. Exactly one name survives all of them — arrest
them.

Inspired by the physical puzzle books ("46,600 suspects, 18 clues, 1 killer"),
but every case is generated fresh, so the file is never the same twice.

**Play:** https://th1nkful.github.io/murder-mystery/ (once Pages is switched on
— see [Deployment](#deployment))

## How a case works

A casefile is a grid of first names — four columns by ten rows on each numbered
page — and three sizes to play at:

| Difficulty | Pages | Suspects | Clues |
| ---------- | ----: | -------: | ----: |
| Rookie     |     6 |      240 |   ~8  |
| Detective  |    18 |      720 |  ~11  |
| Inspector  |    36 |    1,440 |  ~14  |

Clues talk about the killer's name (its length, its letters, its vowels, double
letters, where it falls alphabetically) and about where they sit in the file
(page number, row, column, which side of the page, whose page they are near).
Nothing is a riddle: every clue is a plain fact you can check by eye, on the
page in front of you.

Every name in a case is different, so a clue that points at someone — "a later
page than Floyd" — can only mean one person.

A case has three tabs: **Case** (the brief, the scene, who died and who is
accused), **Clues**, and **Suspects** (the pages). Tap a name to cross it out,
tap again to bring them back, tap a row or column number to strike the lot, or
clear a whole page from the toolbar; a page with nobody left fades out in the
page strip. Progress, the clock and your
ticked-off clues are kept in the browser, so a case survives closing the tab.
Stuck on a clue? The app will apply it for you — it gets counted, and a case
solved without help is worth more.

### Locked files

Tick **Locked file** before opening a case and it starts with three clues
instead of all of them. The next clue opens once you have crossed out everyone
the clues in your hand can rule out — measured by counting how many suspects
still satisfy every revealed clue, so the file only gives up more once the work
is actually done. Unlocking is sticky: a clue that is out stays out.

## What makes a case fair

Case generation is the interesting part. A case is only shipped to the player
once it satisfies all of these:

- **Exactly one suspect** in the file fits every clue, and it is the intended killer.
- **No clue is a restatement of another.** Two clues that keep the same set of
  suspects — or where one's set contains the other's — never appear together.
- **No giveaway clues.** No single clue cuts the casefile below a quarter of its
  names, so no clue does the whole job on its own.
- **No shortcut.** No three clues together name the killer; the file has to be
  worked.
- **Every clue is close to pulling its weight.** Clues are chosen to knock out
  roughly the share of suspects needed to land on one name across the whole
  list, and clues the rest of the list already implies are pruned out.
- **No name appears twice.** The pool is larger than the biggest casefile, so
  every suspect in a file is a distinct first name and a clue that names
  someone is never ambiguous.

These are enforced by the generator and locked in by the test suite in
[`src/game/__tests__/generator.test.ts`](src/game/__tests__/generator.test.ts),
which rebuilds 25 cases per difficulty on every run and checks each property.

Cases are built from a seed with a small deterministic PRNG, so a seed always
rebuilds the same casefile, clues and killer. Only the seed is ever stored —
never the 1,440 names.

## Running it

```sh
npm install
npm run dev      # local dev server
npm test         # generator invariants
npm run lint
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Deployment

The build uses relative asset paths, so the same `dist/` works from a GitHub
Pages project page, a Vercel deployment, or any subdirectory — no per-host
configuration and no rebuild between them. Both routes below are set up; pick
one, or run both.

### GitHub Pages

Already wired up in `.github/workflows/deploy.yml`: pull requests into `main`
run lint, tests and the build, and pushes to `main` do the same and then
publish `dist/`. It needs one setting turned on, once:

**Settings → Pages → Source → GitHub Actions**

The next push to `main` then publishes to
`https://th1nkful.github.io/murder-mystery/`. Nothing to install and no account
beyond GitHub.

### Vercel

`vercel.json` pins the build command, the output directory and long-lived
caching for the hashed assets — but Vercel detects a Vite app on its own, so
importing the repo at [vercel.com/new](https://vercel.com/new) and accepting
the defaults is enough. It builds every push and gives preview URLs for
branches, which Pages does not.

If you would rather not connect the repo, `npx vercel --prod` from a checkout
deploys the same thing.

## Layout

```
src/
  game/
    names.ts      the pool of first names a casefile is drawn from
    clues.ts      the clue rules, grouped into families
    generator.ts  builds and vets a case from a seed
    rng.ts        seeded PRNG and case codes
    storage.ts    progress, resume and stats in localStorage
    types.ts      shared types and the difficulty table
  components/
    art/          seeded mugshot silhouettes and line-art crime scenes
    ...           the screens: home, case, clues, casefile, arrest, verdict
```

Built with React, TypeScript and Vite. No runtime dependencies beyond React,
no web fonts, no network calls — the whole game runs offline once loaded.
