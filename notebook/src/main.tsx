import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Polyfill process for libraries that expect it
if (typeof window !== 'undefined') {
  if (!window.process) {
    // @ts-ignore
    window.process = { env: { NODE_ENV: import.meta.env.MODE } };
  }
  if (!window.global) {
    // @ts-ignore
    window.global = window;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
