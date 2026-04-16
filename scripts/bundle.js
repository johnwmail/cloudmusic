#!/usr/bin/env node
/**
 * Build script: bundles static assets into the worker using esbuild define
 */
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// Read static files
const styleCss = readFileSync(join(ROOT, "static", "style.css"), "utf-8");
const scriptJs = readFileSync(join(ROOT, "static", "script.js"), "utf-8");

const outDir = join(ROOT, "dist");
mkdirSync(outDir, { recursive: true });

// Build with esbuild, injecting static files as constants
await build({
  entryPoints: [join(ROOT, "src", "worker-with-assets.ts")],
  outfile: join(outDir, "worker.mjs"),
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  external: ["cloudflare:workers"],
  define: {
    __STYLE_CSS__: JSON.stringify(styleCss),
    __SCRIPT_JS__: JSON.stringify(scriptJs),
  },
  logLevel: "info",
});

console.log("✓ Built dist/worker.mjs");
