import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  resolve: {
    alias:
      mode === "audit"
        ? [{ find: "react-dom/client", replacement: "react-dom/profiling" }]
        : [],
  },
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: { sourcemap: false, chunkSizeWarningLimit: 650 },
}));
