import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ReplayPage } from "./replay/ReplayPage";

/** Hash routing: no server rewrite needed, so it also works on a static deploy. */
function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash === "#/replay" ? <ReplayPage /> : <App />;
}

// No StrictMode on purpose: its double-mounted effects fight the module-level singletons of this spike.
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(<Root />);
