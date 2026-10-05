// ============================================================================
// Applies supabase/schema.sql then supabase/seed.sql to the database in
// DATABASE_URL. Safe to re-run — both files are idempotent by design.
//
//     npm run db:setup
//
// If you would rather not use the CLI, paste the two SQL files into the
// Supabase SQL Editor instead, schema first. This script only exists so you
// don't have to paste a 250KB file into a browser.
// ============================================================================

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load .env.local without adding a dotenv dependency.
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // file absent — fine, the variable may come from the real environment
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(`
DATABASE_URL is not set.

Create a file called .env.local in the project root containing:

  DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>.pooler.supabase.com:6543/postgres

Find it in Supabase: Project Settings -> Database -> Connection string ->
choose "Transaction pooler" and copy the URI, then replace [YOUR-PASSWORD]
with your database password.
`);
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 30 });

async function run(file) {
  const text = readFileSync(join(ROOT, "supabase", file), "utf8");
  const started = Date.now();
  process.stdout.write(`applying ${file} (${(text.length / 1024).toFixed(0)} KB) ... `);
  // .simple() uses the simple query protocol, which is what allows a file
  // containing many statements to be sent as one request.
  await sql.unsafe(text).simple();
  console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

try {
  await run("schema.sql");
  await run("seed.sql");

  const [counts] = await sql`
    select
      (select count(*) from organizations)     as organizations,
      (select count(*) from users)             as users,
      (select count(*) from fests)             as fests,
      (select count(*) from events)            as events,
      (select count(*) from event_form_fields) as form_fields,
      (select count(*) from registrations)     as registrations
  `;
  console.log("\nDatabase ready:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(14)} ${v}`);
  }
  console.log("\nDemo login: admin@axon.club / axon1234");
} catch (err) {
  console.error("\nFailed:", err.message);
  if (err.message.includes("Tenant or user not found") || err.message.includes("password")) {
    console.error("\nThat usually means the password in DATABASE_URL is wrong, or");
    console.error("[YOUR-PASSWORD] was never replaced with the real one.");
  }
  process.exitCode = 1;
} finally {
  await sql.end();
}
