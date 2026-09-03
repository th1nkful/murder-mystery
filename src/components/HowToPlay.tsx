import Sheet from "./Sheet";

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="How to play" onClose={onClose}>
      <ol className="rules">
        <li>
          <strong>Read the clues.</strong> Every one of them is true of the killer. Nothing is a
          riddle and nothing is a trick — each clue is a plain fact you can check by eye.
        </li>
        <li>
          <strong>Work the casefile.</strong> Names are laid out in a grid, four columns wide and
          ten rows deep, on numbered pages. Tap anyone a clue rules out to cross them off. Tap them
          again if you change your mind.
        </li>
        <li>
          <strong>One name survives.</strong> Exactly one suspect in the file fits every clue.
          When you are sure, make the arrest. You get three tries.
        </li>
      </ol>

      <h3>The small print</h3>
      <ul className="rules plain">
        <li>Vowels are A, E, I, O and U. Y never counts as one.</li>
        <li>
          A <em>double letter</em> means the same letter twice in a row, as in Emma. A{" "}
          <em>repeated letter</em> is any letter used twice anywhere, as in Alan.
        </li>
        <li>Rows are numbered down the left of a page, columns across the top.</li>
        <li>
          Clues that name another suspect — “a later page than Floyd” — always refer to someone who
          appears in the file exactly once, so there is no ambiguity.
        </li>
        <li>
          Names repeat. Two people can share a first name; the clues will separate them by where
          they sit in the file.
        </li>
        <li>
          Stuck? “Let the desk sergeant do it” applies a clue for you and crosses out everyone it
          rules out. It is counted, and a case solved without it is worth more.
        </li>
      </ul>
    </Sheet>
  );
}
