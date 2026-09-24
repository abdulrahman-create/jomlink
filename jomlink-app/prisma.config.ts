import { config as dotenvConfig } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.local (Prisma CLI does not load it automatically).
dotenvConfig({ path: ".env.local" });
dotenvConfig();

/**
 * Prisma 7 configuration (the CLI reads this instead of schema datasource url).
 * DATABASE_URL must be present in the environment (.env.local / process env).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});