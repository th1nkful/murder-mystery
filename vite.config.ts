import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset URLs, so the same build works from the repo root, from a
  // project page (/murder-mystery/) or from a local preview.
  base: "./",
  plugins: [react()],
});
