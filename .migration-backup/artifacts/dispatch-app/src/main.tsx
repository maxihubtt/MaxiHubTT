import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

declare global {
  interface Window { __hideSplash?: () => void; }
}
requestAnimationFrame(() => {
  setTimeout(() => window.__hideSplash?.(), 80);
});
