import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Project Pages: https://<user>.github.io/<repo>/
// Override locally with VITE_BASE_PATH=/ if needed.
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  plugins: [react()],
  base,
});
