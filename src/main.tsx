import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./tokens.css";
import "./styles.css";
import App from "./App";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query";
import { AuditProfiler } from "./components/AuditProfiler";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuditProfiler>
        <App />
      </AuditProfiler>
    </QueryClientProvider>
  </React.StrictMode>,
);
