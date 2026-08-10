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

// 커넥션 하나를 새로 맺는 데 TLS·인증 왕복이 여러 번 필요하다. 유휴 시간이 짧으면
// 방문마다 핸드셰이크를 다시 하므로, 컨테이너가 살아 있는 동안은 재사용한다.
const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
    max: Number.isFinite(maxConnections) ? maxConnections : 2,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
