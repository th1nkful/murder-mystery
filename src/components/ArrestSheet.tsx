import { useMemo, useState } from "react";
import type { DetectiveCase, Suspect } from "../game/types";
import Sheet from "./Sheet";
import SuspectList from "./SuspectList";

const LIMIT = 60;

interface Props {
  detectiveCase: DetectiveCase;
  eliminated: Set<number>;
  attemptsLeft: number;
  onArrest: (suspect: Suspect) => void;
  onClose: () => void;
}

export default function ArrestSheet({
  detectiveCase,
  eliminated,
  attemptsLeft,
  onArrest,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Suspect | null>(null);
  const trimmed = query.trim().toLowerCase();

  const standing = useMemo(
    () => detectiveCase.suspects.filter((s) => !eliminated.has(s.id)),
    [detectiveCase.suspects, eliminated],
  );
  const shown = useMemo(
    () => (trimmed ? standing.filter((s) => s.name.toLowerCase().startsWith(trimmed)) : standing),
    [standing, trimmed],
  );

  if (pending) {
    return (
      <Sheet title="Are you sure?" onClose={() => setPending(null)}>
        <p className="confirm-line">
          You are about to arrest <strong>{pending.name}</strong>, page {pending.page}, row{" "}
          {pending.row}, column {pending.col}.
        </p>
        <p className="confirm-warn">
          {attemptsLeft > 1
            ? `Get it wrong and you have ${attemptsLeft - 1} ${attemptsLeft - 1 === 1 ? "try" : "tries"} left.`
            : "This is your last try. Get it wrong and the case goes cold."}
        </p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={() => setPending(null)}>
            Not yet
          </button>
          <button className="primary-button danger" onClick={() => onArrest(pending)}>
            Arrest {pending.name}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Make an arrest"
      subtitle={`${standing.length.toLocaleString()} still standing · ${attemptsLeft} ${attemptsLeft === 1 ? "try" : "tries"} left`}
      onClose={onClose}
    >
      {standing.length > LIMIT && (
        <input
          className="text-input"
          type="search"
          value={query}
          placeholder="Filter by name…"
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <SuspectList
        suspects={shown.slice(0, LIMIT)}
        eliminated={eliminated}
        truncatedFrom={shown.length}
        emptyMessage={
          standing.length === 0
            ? "You have crossed out everybody. Bring someone back first."
            : "Nobody left standing by that name."
        }
        actionLabel="arrest"
        onSelect={setPending}
      />
    </Sheet>
  );
}
