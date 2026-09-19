import { createRoot } from "react-dom/client";
import { App } from "./App";

// No StrictMode on purpose: its double-mounted effects fight the module-level singletons of this spike.
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(<App />);
