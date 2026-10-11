import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/700.css";
import { BrowserRouter } from "react-router-dom";
import { LayoutProvider } from "./context/LayoutContext.jsx";

// Browsers step a focused number input's value on mouse-wheel scroll. Blur it
// instead so the value stays put and the page/modal scrolls as usual.
document.addEventListener(
  "wheel",
  () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === "number") {
      active.blur();
    }
  },
  { passive: true },
);

// After a new deploy, an open tab still points at the old build's chunk
// files, which no longer exist — opening a lazy page then fails. Reload once
// to pick up the new build (guarded so a real outage can't loop).
window.addEventListener("vite:preloadError", (event) => {
  const key = "chunk-reload-at";
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(key) || 0);
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // storage blocked — still reload once below
  }
  if (Date.now() - last > 10000) {
    event.preventDefault();
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <LayoutProvider>
        <App />
      </LayoutProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
