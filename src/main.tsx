import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/600.css";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";

const raiz = document.getElementById("root");

if (!raiz) {
  throw new Error("Elemento #root não encontrado no index.html.");
}

ReactDOM.createRoot(raiz).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
