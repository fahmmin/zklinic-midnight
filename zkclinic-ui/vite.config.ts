import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  resolve: {
    // Prefer TypeScript sources over stray compiled `.js` in `src/` (same basename).
    extensions: [".tsx", ".ts", ".mts", ".jsx", ".mjs", ".js", ".json"]
  },
  define: {
    global: "globalThis"
  },
  plugins: [
    nodePolyfills({
      // crypto: required by @midnight-ntwrk/midnight-js-level-private-state-provider (browser IndexedDB store)
      include: ["buffer", "process", "crypto"],
      globals: { Buffer: true, process: true }
    }),
    wasm(),
    topLevelAwait(),
    react()
  ],
  optimizeDeps: {
    esbuildOptions: { define: { global: "globalThis" } },
    exclude: ["tesseract.js"]
  },
  server: {
    fs: { allow: [".."] }
  }
});
