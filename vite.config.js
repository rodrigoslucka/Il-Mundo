import { cpSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: (asset) => asset.name === "manifest.webmanifest"
          ? "manifest.webmanifest"
          : "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [{
    name: "copy-pwa-files",
    writeBundle(options) {
      const outputDirectory = options.dir || resolve(projectRoot, "dist");
      cpSync(resolve(projectRoot, "assets"), resolve(outputDirectory, "assets"), { recursive: true });
      copyFileSync(resolve(projectRoot, "sw.js"), resolve(outputDirectory, "sw.js"));
    },
  }],
});
