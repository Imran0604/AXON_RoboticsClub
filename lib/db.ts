import "server-only";
import postgres from "postgres";

/**
 * Single shared Postgres client.
 *
 * `prepare: false` is required when connecting through Supabase's transaction
 * pooler — it multiplexes connections, so prepared statements cannot be
 * relied upon to still exist on the next query.
 *
 * The client is cached on globalThis in development because Next's hot reload
 * re-evaluates modules, and without the cache every edit would open a new
 * pool until the database refused connections.
 */

declare global {
  // eslint-disable-next-line no-var
  var __axonSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in " +
        "your Supabase connection string, then restart the dev server."
    );
  }
  return postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    transform: { undefined: null },
  });
}

export const sql = globalThis.__axonSql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__axonSql = sql;
}
