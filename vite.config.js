import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = "https://ai-nex-model-wise-be.onrender.com";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: backendTarget, changeOrigin: true },
      "/health": { target: backendTarget, changeOrigin: true },
    },
  },
});
