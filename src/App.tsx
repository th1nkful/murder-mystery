import { useCallback, useEffect, useState } from "react";
import Home from "./components/Home";
import Game from "./components/Game";
import HowToPlay from "./components/HowToPlay";
import type { CaseRef } from "./game/storage";
import { loadCurrent, saveCurrent } from "./game/storage";

type Route = { kind: "home" } | { kind: "game"; caseRef: CaseRef };

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: "home" });
  const [rules, setRules] = useState(false);
  const [resumable, setResumable] = useState<CaseRef | null>(() => loadCurrent());

  const [lockedMode, setLockedMode] = useState(false);

  const openCase = useCallback((caseRef: CaseRef, locked = false) => {
    saveCurrent(caseRef);
    setResumable(caseRef);
    setLockedMode(locked);
    setRoute({ kind: "game", caseRef });
  }, []);

  const goHome = useCallback(() => {
    setResumable(loadCurrent());
    setRoute({ kind: "home" });
  }, []);

  // Make the phone's back button leave the case rather than the site.
  useEffect(() => {
    if (route.kind !== "game") return;
    window.history.pushState({ game: true }, "");
    const onPop = () => goHome();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [route, goHome]);

  return (
    <>
      {route.kind === "home" ? (
        <Home resumable={resumable} onOpenCase={openCase} onShowRules={() => setRules(true)} />
      ) : (
        <Game
          key={`${route.caseRef.difficulty}:${route.caseRef.seed}`}
          caseRef={route.caseRef}
          lockedByDefault={lockedMode}
          onExit={goHome}
          onOpenCase={openCase}
          onShowRules={() => setRules(true)}
        />
      )}
      {rules && <HowToPlay onClose={() => setRules(false)} />}
    </>
  );
}
