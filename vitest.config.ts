import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      main: "./src/worker-with-assets.ts",
      modulesRules: [{ type: "ESModule", include: ["**/*.ts"] }],
    }),
  ],
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
