import type { SceneId } from "../../game/types";

/**
 * Line-art crime scenes, one per location the case generator can pick.
 * All drawn on the same 200×110 stage, in two weights: a faint structure and
 * a gold accent on whatever the eye should land on.
 */
const SCENES: Record<SceneId, { title: string; draw: React.ReactNode }> = {
  hotel: {
    title: "A hotel front at night",
    draw: (
      <>
        <path className="dim" d="M30 100V32h140v68" />
        <path className="dim" d="M46 46h20v16H46zM88 46h20v16H88zM130 46h20v16h-20zM46 72h20v16H46zM130 72h20v16h-20z" />
        <path className="accent" d="M88 72h20v28H88z" />
        <path className="accent" d="M78 34h44l-6 10H84z" />
        <path className="dim" d="M20 100h160" />
      </>
    ),
  },
  flat: {
    title: "A locked door",
    draw: (
      <>
        <path className="dim" d="M62 100V24h76v76" />
        <path className="accent" d="M74 36h52v56H74z" />
        <circle className="accent" cx="116" cy="64" r="3.5" />
        <path className="accent" d="M116 67v7" />
        <path className="dim" d="M20 100h160M150 44h26v20h-26z" />
      </>
    ),
  },
  pier: {
    title: "A pier over dark water",
    draw: (
      <>
        <circle className="dim" cx="152" cy="30" r="14" />
        <path className="accent" d="M24 58h120v8H24z" />
        <path className="dim" d="M36 66v26M60 66v26M84 66v26M108 66v26M132 66v26" />
        <path className="accent" d="M56 58V38h56v20" />
        <path className="dim" d="M20 96c12-5 20 5 32 0s20 5 32 0 20 5 32 0 20 5 32 0" />
      </>
    ),
  },
  library: {
    title: "Library shelves",
    draw: (
      <>
        <path className="dim" d="M28 22h144v78H28z" />
        <path className="dim" d="M28 48h144M28 74h144" />
        <path className="accent" d="M36 28h6v18h-6zM46 28h4v18h-4zM54 26h7v20h-7z" />
        <path className="dim" d="M70 28h5v18h-5zM80 30h6v16h-6zM92 28h4v18h-4z" />
        <path className="accent" d="M36 54h5v18h-5zM45 56h7v16h-7z" />
        <path className="dim" d="M104 54h6v18h-6zM116 56h4v16h-4zM126 54h7v18h-7zM140 56h5v16h-5z" />
        <path className="dim" d="M36 80h8v18h-8zM50 82h5v16h-5zM62 80h6v18h-6z" />
      </>
    ),
  },
  theatre: {
    title: "A dressing-room mirror",
    draw: (
      <>
        <path className="accent" d="M62 20h76v70H62z" />
        <circle className="accent" cx="56" cy="28" r="4" />
        <circle className="accent" cx="56" cy="48" r="4" />
        <circle className="accent" cx="56" cy="68" r="4" />
        <circle className="accent" cx="144" cy="28" r="4" />
        <circle className="accent" cx="144" cy="48" r="4" />
        <circle className="accent" cx="144" cy="68" r="4" />
        <path className="dim" d="M76 82c0-16 10-26 24-26s24 10 24 26" />
        <path className="dim" d="M40 96h120v6H40z" />
      </>
    ),
  },
  ferry: {
    title: "A night ferry",
    draw: (
      <>
        <path className="accent" d="M46 78h108l-14 16H60z" />
        <path className="dim" d="M64 78V56h72v22" />
        <path className="accent" d="M78 62h12v12H78zM110 62h12v12h-12z" />
        <path className="dim" d="M96 56V38h10v18" />
        <path className="dim" d="M20 100c14-6 22 4 34 0s22 4 34 0 22 4 34 0 22 4 34 0" />
        <circle className="dim" cx="40" cy="30" r="3" />
        <circle className="dim" cx="168" cy="42" r="3" />
      </>
    ),
  },
  observatory: {
    title: "An observatory dome",
    draw: (
      <>
        <path className="dim" d="M56 100V66a44 44 0 0 1 88 0v34" />
        {/* the open slit, and a telescope tube leaning out through it */}
        <path className="dim" d="M88 30v36M106 25v41" />
        <path className="accent" d="M82 88l46-40" strokeWidth="5" />
        <path className="accent" d="M120 40l16 14" />
        <circle className="dim" cx="34" cy="28" r="2.5" />
        <circle className="dim" cx="60" cy="18" r="2" />
        <circle className="dim" cx="170" cy="24" r="2.5" />
        <circle className="dim" cx="150" cy="14" r="2" />
        <path className="dim" d="M20 100h160" />
      </>
    ),
  },
  viaduct: {
    title: "Arches beneath a viaduct",
    draw: (
      <>
        <path className="dim" d="M16 26h168v14H16z" />
        <path className="dim" d="M30 100V70a22 22 0 0 1 44 0v30" />
        <path className="accent" d="M78 100V70a22 22 0 0 1 44 0v30" />
        <path className="dim" d="M126 100V70a22 22 0 0 1 44 0v30" />
        <path className="accent" d="M92 78h16v22H92z" />
        <path className="dim" d="M16 100h168" />
      </>
    ),
  },
  greenhouse: {
    title: "A glasshouse",
    draw: (
      <>
        <path className="dim" d="M40 100V52l60-30 60 30v48z" />
        <path className="dim" d="M100 22v78M40 52l60 24 60-24M70 37v52M130 37v52" />
        <path className="accent" d="M86 100V86c0-8 6-12 14-12s14 4 14 12v14z" />
        <path className="accent" d="M100 86c-8-6-10-14-8-22 8 2 12 8 12 16" />
        <path className="dim" d="M20 100h160" />
      </>
    ),
  },
  train: {
    title: "The last carriage",
    draw: (
      <>
        <path className="dim" d="M34 84V34a10 10 0 0 1 10-10h112a10 10 0 0 1 10 10v50z" />
        <path className="dim" d="M48 42h24v22H48zM82 42h24v22H82z" />
        <path className="accent" d="M116 42h24v22h-24z" />
        <path className="dim" d="M34 84h132" />
        <circle className="dim" cx="60" cy="94" r="9" />
        <circle className="dim" cx="140" cy="94" r="9" />
        <path className="accent" d="M20 100h160" />
      </>
    ),
  },
};

interface Props {
  scene: SceneId;
  className?: string;
}

export default function Scene({ scene, className }: Props) {
  const art = SCENES[scene];
  return (
    <svg
      viewBox="0 0 200 110"
      className={["scene", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={art.title}
      preserveAspectRatio="xMidYMid meet"
    >
      {art.draw}
    </svg>
  );
}
