import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.NODE_ENV === "production" && !isLocalDatabase);
const maxConnections = Number(
  process.env.DB_POOL_MAX ?? (process.env.NODE_ENV === "production" ? "2" : "10")
);

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: Number.isFinite(maxConnections) ? maxConnections : 2,
    idleTimeoutMillis: 10_000,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
