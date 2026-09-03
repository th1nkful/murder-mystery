import { memo, useEffect, useMemo, useRef } from "react";
import type { DetectiveCase, Suspect } from "../game/types";

interface Props {
  detectiveCase: DetectiveCase;
  eliminated: Set<number>;
  page: number;
  spotlight: number | null;
  revealed: boolean;
  killerId: number;
  onPage: (page: number) => void;
  onToggle: (id: number) => void;
  onCrossOutPage: (page: number) => void;
  onRestorePage: (page: number) => void;
  onUndo?: () => void;
  onSearch: () => void;
}

export default function CasefilePanel({
  detectiveCase,
  eliminated,
  page,
  spotlight,
  revealed,
  killerId,
  onPage,
  onToggle,
  onCrossOutPage,
  onRestorePage,
  onUndo,
  onSearch,
}: Props) {
  const { cols, rows, pages, suspects } = detectiveCase;
  const perPage = cols * rows;
  const stripRef = useRef<HTMLDivElement>(null);

  const standingPerPage = useMemo(() => {
    const counts = new Array<number>(pages + 1).fill(0);
    for (const suspect of suspects) {
      if (!eliminated.has(suspect.id)) counts[suspect.page]++;
    }
    return counts;
  }, [suspects, eliminated, pages]);

  const pageSuspects = useMemo(
    () => suspects.slice((page - 1) * perPage, page * perPage),
    [suspects, page, perPage],
  );
  const pageCleared = standingPerPage[page] === 0;

  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [page]);

  return (
    <div className="panel file-panel">
      <div className="file-toolbar">
        <button
          className="chip"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          ‹
        </button>
        <span className="file-page-label">
          Page <strong>{page}</strong> of {pages}
        </span>
        <button
          className="chip"
          onClick={() => onPage(Math.min(pages, page + 1))}
          disabled={page === pages}
          aria-label="Next page"
        >
          ›
        </button>
        <span className="toolbar-spacer" />
        {onUndo && (
          <button className="chip" onClick={onUndo}>
            Undo
          </button>
        )}
        <button className="chip" onClick={onSearch}>
          Find a name
        </button>
      </div>

      <div className="file-toolbar">
        {pageCleared ? (
          <button className="chip" onClick={() => onRestorePage(page)} disabled={revealed}>
            Bring page {page} back
          </button>
        ) : (
          <button className="chip" onClick={() => onCrossOutPage(page)} disabled={revealed}>
            Cross out the rest of page {page}
          </button>
        )}
        <span className="toolbar-spacer" />
        <span className="file-hint">tap a name to strike it</span>
      </div>

      <div className="page-strip" ref={stripRef}>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            data-active={n === page}
            className={[
              "page-pip",
              n === page ? "active" : "",
              standingPerPage[n] === 0 ? "cleared" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onPage(n)}
            aria-label={
              standingPerPage[n] === 0
                ? `Page ${n}, all crossed out`
                : `Page ${n}, ${standingPerPage[n]} still standing`
            }
          >
            <span className="pip-number">{n}</span>
            <span className="pip-count">{standingPerPage[n]}</span>
          </button>
        ))}
      </div>

      <div className="sheet-paper">
        <div className="paper-head">
          <span>Casefile · page {page}</span>
          <span>
            {standingPerPage[page]}/{perPage} left
          </span>
        </div>
        <div className="grid" style={{ ["--cols" as string]: cols }}>
          <span className="grid-corner" aria-hidden="true" />
          {Array.from({ length: cols }, (_, i) => (
            <span className="grid-col-head" key={`col-${i}`} aria-hidden="true">
              {i + 1}
            </span>
          ))}
          {Array.from({ length: rows }, (_, r) => (
            <Row
              key={r}
              rowNumber={r + 1}
              suspects={pageSuspects.slice(r * cols, (r + 1) * cols)}
              eliminated={eliminated}
              spotlight={spotlight}
              revealed={revealed}
              killerId={killerId}
              onToggle={onToggle}
            />
          ))}
        </div>
        <p className="paper-foot">
          {pageCleared
            ? "Nobody left on this page."
            : "Tap a name to cross it out. Tap again to bring them back."}
        </p>
      </div>
    </div>
  );
}

interface RowProps {
  rowNumber: number;
  suspects: Suspect[];
  eliminated: Set<number>;
  spotlight: number | null;
  revealed: boolean;
  killerId: number;
  onToggle: (id: number) => void;
}

function Row({
  rowNumber,
  suspects,
  eliminated,
  spotlight,
  revealed,
  killerId,
  onToggle,
}: RowProps) {
  return (
    <>
      <span className="grid-row-head" aria-hidden="true">
        {rowNumber}
      </span>
      {suspects.map((suspect) => (
        <NameCell
          key={suspect.id}
          id={suspect.id}
          name={suspect.name}
          row={suspect.row}
          col={suspect.col}
          out={eliminated.has(suspect.id)}
          spotlit={spotlight === suspect.id}
          unmasked={revealed && suspect.id === killerId}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

interface CellProps {
  id: number;
  name: string;
  row: number;
  col: number;
  out: boolean;
  spotlit: boolean;
  unmasked: boolean;
  onToggle: (id: number) => void;
}

/** Memoised: a page holds 40 of these and the clock re-renders the screen every second. */
const NameCell = memo(function NameCell({
  id,
  name,
  row,
  col,
  out,
  spotlit,
  unmasked,
  onToggle,
}: CellProps) {
  const classes = ["name-cell"];
  if (out) classes.push("out");
  if (spotlit) classes.push("spotlit");
  if (unmasked) classes.push("unmasked");
  return (
    <button
      className={classes.join(" ")}
      onClick={() => onToggle(id)}
      aria-pressed={out}
      aria-label={`${name}, row ${row}, column ${col}${out ? ", crossed out" : ""}`}
    >
      {name}
    </button>
  );
});
