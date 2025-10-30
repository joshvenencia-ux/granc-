// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";
import "./styles.css";

import App from "./App";
import { AuthProvider } from "@/auth/AuthContext";
import { initAuthWalletBridge } from "./lib/sessionBridge";

initAuthWalletBridge();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No se encontró #root");

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
