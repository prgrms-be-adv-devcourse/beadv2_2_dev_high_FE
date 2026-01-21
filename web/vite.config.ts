import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@moreauction/api-client": path.resolve(__dirname, "../packages/api-client/src"),
      "@moreauction/types": path.resolve(__dirname, "../packages/types/src"),
      "@moreauction/utils": path.resolve(__dirname, "../packages/utils/src"),
    },
  },
  base: "/",
  define: {
    global: "globalThis",
  },
});
