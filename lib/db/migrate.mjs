import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to apply migrations.");
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  // Serialize deploys using the same connection as the migration transaction.
  await client.query("SET lock_timeout = '60s'");
  await client.query("SELECT pg_advisory_lock(728104, 1)");
  await migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL("./migrations/", import.meta.url)),
  });
  console.log("Database migrations applied successfully.");
} finally {
  // Closing the session also releases the advisory lock on success or failure.
  await client.end();
}
