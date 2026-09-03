import { Fragment } from "react";

/** Clue copy marks its key phrase with *asterisks*; render those highlighted. */
export default function ClueText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
          <mark key={i}>{part.slice(1, -1)}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
