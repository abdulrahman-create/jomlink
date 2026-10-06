import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest configuration.
 *
 * The `@/*` alias mirrors tsconfig.json `paths`, so tests import modules exactly
 * as the application does — a test that has to reach for a relative `../../src`
 * path is a test that will drift from the app.
 *
 * Only pure logic is tested here (see `src/lib/*.test.ts`). Anything touching
 * Supabase, Next.js request context or the filesystem belongs in an integration
 * harness, not this suite.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
