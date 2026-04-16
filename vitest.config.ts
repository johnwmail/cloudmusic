import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    pool: "@cloudflare/vitest-pool-workers",
    include: ["src/**/*.test.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        main: "./src/worker-with-assets.ts",
        modulesRules: [{ type: "ESModule", include: ["**/*.ts"] }],
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
