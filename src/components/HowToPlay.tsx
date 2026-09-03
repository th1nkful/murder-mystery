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
          again if you change your mind, or cross out a whole page at once from the toolbar. A
          page with nobody left on it fades out in the page strip.
        </li>
        <li>
          <strong>One name survives.</strong> Exactly one suspect in the file fits every clue.
          When you are sure, make the arrest. You get three tries.
        </li>
      </ol>

      <h3>Locked files</h3>
      <p className="rules-para">
        Tick <em>Locked file</em> before opening a case and you start with three clues instead of
        the lot. The next clue opens when you have crossed out everyone the clues in your hand can
        rule out — so the file only gives up more once you have earned it. Once a clue is out, it
        stays out.
      </p>

      <h3>The small print</h3>
      <ul className="rules plain">
        <li>Vowels are A, E, I, O and U. Y never counts as one.</li>
        <li>
          A <em>double letter</em> means the same letter twice in a row, as in Emma. A{" "}
          <em>repeated letter</em> is any letter used twice anywhere, as in Alan.
        </li>
        <li>Rows are numbered down the left of a page, columns across the top.</li>
        <li>
          Clues that name another suspect — “a later page than Floyd” — point at the one person in
          the file with that name.
        </li>
        <li>
          The casefile lists first names only — that is all the folder holds — and every one of
          them is different, so a name always means one person.
        </li>
        <li>
          Stuck? “apply this for me” crosses out everyone a clue rules out. It is counted, and a
          case solved without it is worth more.
        </li>
      </ul>
    </Sheet>
  );
}
