import { useMemo } from "react";
import { hashSeed, mulberry32 } from "../../game/rng";

type Tone = "victim" | "killer" | "client";

interface Props {
  /** Same seed draws the same figure every time. */
  seed: string;
  tone?: Tone;
  size?: number;
  className?: string;
}

/**
 * A mugshot silhouette against a height chart.
 *
 * Deliberately faceless: these are people in a file, not characters, and a
 * drawn-on face turns a murder case into a cartoon. Variation comes from the
 * outline — hair, hat, collar, build — which is enough to make two suspects
 * read as different people.
 */

const HAIR = [
  // cropped
  "M31 42c0-12 8-19 19-19s19 7 19 19c-3-7-9-10-19-10s-16 3-19 10z",
  // swept back
  "M30 44c1-13 9-21 20-21s19 7 20 20c-5-8-8-10-15-10-5 0-8 2-12 4s-9 3-13 7z",
  // long
  "M29 43c0-13 9-20 21-20s21 7 21 20v27c-3-3-4-11-4-20-6 5-28 5-34 0 0 9-1 17-4 20z",
  // bun
  "M31 43c0-12 8-20 19-20s19 8 19 20c-4-8-9-11-19-11s-15 3-19 11zM68 21a6 6 0 1 1 0 12 6 6 0 0 1 0-12z",
  // curls
  "M30 44c0-13 9-21 20-21s20 8 20 21c-2-4-5-4-7-7-3 3-6 3-9 0-3 4-7 4-10 1-3 3-6 4-9 1-2 3-3 3-5 5z",
  // bald
  "M33 40c3-9 9-13 17-13s14 4 17 13c-4-5-9-7-17-7s-13 2-17 7z",
];

const HATS = [
  // fedora
  "M20 43h60c0 4-6 6-30 6s-30-2-30-6zM33 43c0-14 5-20 17-20s17 6 17 20z",
  // flat cap
  "M28 43c0-13 7-19 19-19 10 0 17 6 18 15l11 4c0 2-7 3-24 3s-24-1-24-3z",
];

const COLLARS = [
  // open collar
  "M18 132v-14c0-11 9-17 20-21l12 13 12-13c11 4 20 10 20 21v14z",
  // heavy coat
  "M16 132v-13c0-12 10-18 22-22l12 12 12-12c12 4 22 10 22 22v13zM50 109v23",
  // narrow shoulders
  "M24 132v-12c0-10 8-16 17-19l9 11 9-11c9 3 17 9 17 19v12z",
];

const TONES: Record<Tone, { figure: string; frame: string }> = {
  victim: { figure: "#7c7468", frame: "rgba(243,237,225,0.22)" },
  client: { figure: "var(--gold)", frame: "rgba(227,178,99,0.45)" },
  killer: { figure: "var(--blood)", frame: "rgba(201,74,59,0.55)" },
};

export default function Portrait({ seed, tone = "client", size = 92, className }: Props) {
  const figure = useMemo(() => {
    const rng = mulberry32(hashSeed("portrait:" + seed));
    const from = <T,>(items: readonly T[]) => items[Math.floor(rng() * items.length)];
    return {
      hair: from(HAIR),
      hat: rng() < 0.42 ? from(HATS) : null,
      collar: from(COLLARS),
      headWidth: 18 + Math.round(rng() * 5),
      headY: 55 + Math.round(rng() * 5),
    };
  }, [seed]);

  const palette = TONES[tone];
  const clipId = `mug-${hashSeed(seed).toString(36)}`;

  return (
    <svg
      viewBox="0 0 100 132"
      width={size}
      height={(size / 100) * 132}
      className={["mugshot", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={`Mugshot silhouette, ${tone}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="1" y="1" width="98" height="130" rx="6" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="1" y="1" width="98" height="130" fill="rgba(255,255,255,0.035)" />
        {/* height chart */}
        <g stroke={palette.frame} strokeWidth="1" opacity="0.5">
          <path d="M8 26h10M8 46h14M8 66h10M8 86h14M8 106h10" />
        </g>
        {/* figure */}
        <g fill={palette.figure}>
          <path d={figure.collar} />
          <path d="M45 90h10v16a5 5 0 0 1-10 0z" />
          <ellipse cx="50" cy={figure.headY} rx={figure.headWidth} ry="25" />
          <path d={figure.hair} />
          {figure.hat && <path d={figure.hat} />}
        </g>
      </g>
      <rect
        x="1"
        y="1"
        width="98"
        height="130"
        rx="6"
        fill="none"
        stroke={palette.frame}
        strokeWidth="1.5"
      />
    </svg>
  );
}
