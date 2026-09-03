import type { Suspect } from "../game/types";

interface Props {
  suspects: Suspect[];
  eliminated: Set<number>;
  emptyMessage: string;
  actionLabel: string;
  onSelect: (suspect: Suspect) => void;
  truncatedFrom?: number;
}

export default function SuspectList({
  suspects,
  eliminated,
  emptyMessage,
  actionLabel,
  onSelect,
  truncatedFrom,
}: Props) {
  if (suspects.length === 0) return <p className="empty">{emptyMessage}</p>;

  return (
    <>
      <ul className="suspect-list">
        {suspects.map((suspect) => (
          <li key={suspect.id}>
            <button className="suspect-row" onClick={() => onSelect(suspect)}>
              <span className="suspect-name">{suspect.name}</span>
              <span className="suspect-where">
                page {suspect.page} · row {suspect.row} · col {suspect.col}
              </span>
              <span className={eliminated.has(suspect.id) ? "suspect-state out" : "suspect-state"}>
                {eliminated.has(suspect.id) ? "crossed out" : actionLabel}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {truncatedFrom != null && truncatedFrom > suspects.length && (
        <p className="empty">
          Showing {suspects.length} of {truncatedFrom.toLocaleString()}. Keep narrowing it down.
        </p>
      )}
    </>
  );
}
