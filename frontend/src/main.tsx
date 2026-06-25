import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (typeof window !== 'undefined') {
  console.log('%c⟐ Chorus', 'color: #5e6ad2; font-size: 20px; font-weight: 700; font-family: monospace;');
  console.log('%cBuilt with Rust Lambdas + React 19 + OpenRouter', 'color: #717486; font-size: 12px; font-family: monospace;');
  console.log('%cSource: github.com/amitrk · amitkulkarni.dev', 'color: #464d5d; font-size: 11px; font-family: monospace;');
}
