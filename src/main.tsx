import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPWA } from "./pwa";

registerPWA();

// Prevent blank screens when a new deploy invalidates old lazy-loaded chunks.
// If a dynamic import fails, reload once to fetch the latest assets.
let didReloadAfterChunkError = false;
window.addEventListener("unhandledrejection", (event) => {
  const msg = String((event as any)?.reason?.message || (event as any)?.reason || "");
  if (didReloadAfterChunkError) return;
  if (msg.toLowerCase().includes("failed to fetch dynamically imported module")) {
    didReloadAfterChunkError = true;
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

