import { useMemo, useState } from "react";
import type { DetectiveCase, Suspect } from "../game/types";
import Sheet from "./Sheet";
import SuspectList from "./SuspectList";

const LIMIT = 60;

interface Props {
  detectiveCase: DetectiveCase;
  eliminated: Set<number>;
  onSelect: (suspect: Suspect) => void;
  onClose: () => void;
}

export default function SearchSheet({ detectiveCase, eliminated, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (trimmed.length < 2) return [];
    return detectiveCase.suspects.filter((s) => s.name.toLowerCase().startsWith(trimmed));
  }, [detectiveCase.suspects, trimmed]);

  const exact = useMemo(
    () => matches.filter((s) => s.name.toLowerCase() === trimmed).length,
    [matches, trimmed],
  );

  return (
    <Sheet
      title="Find a name"
      subtitle="Useful for the clues that ask how often a name turns up."
      onClose={onClose}
    >
      <input
        className="text-input"
        type="search"
        value={query}
        autoFocus
        placeholder="Start typing a name…"
        onChange={(e) => setQuery(e.target.value)}
      />
      {exact > 0 && (
        <p className="search-summary">
          That exact name appears <strong>{exact}</strong> {exact === 1 ? "time" : "times"} in this
          casefile.
        </p>
      )}
      <SuspectList
        suspects={matches.slice(0, LIMIT)}
        eliminated={eliminated}
        truncatedFrom={matches.length}
        emptyMessage={
          trimmed.length < 2 ? "Type at least two letters." : "Nobody in the file by that name."
        }
        actionLabel="go to page"
        onSelect={onSelect}
      />
    </Sheet>
  );
}
