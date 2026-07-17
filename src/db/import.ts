/**
 * data/round-1.json ~ round-12.json 을 읽어 모의고사 12회차를 DB에 반영.
 * 기존 모든 시험(및 응시 기록)은 삭제하고 새로 만든다.
 *
 *   ALLOW_DB_RESET=true npm run db:import
 *
 * JSON 형식: 문항 배열
 *   { number: 1~100, subject: "언어이해"|"자료해석"|"창의수리"|"언어추리"|"수열추리",
 *     body: string, choices: string[], answer: 1~N, explanation?: string, imageUrl?: string }
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { exams, questions, SUBJECTS, type Subject } from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.NODE_ENV === "production" && !isLocalDatabase);
const maxConnections = Number(process.env.DB_POOL_MAX ?? "2");

const pool = new Pool({
  connectionString,
  max: Number.isFinite(maxConnections) ? maxConnections : 2,
  idleTimeoutMillis: 10_000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool);

type RawQuestion = {
  number: number;
  subject: Subject;
  body: string;
  choices: string[];
  answer: number;
  explanation?: string | null;
  imageUrl?: string | null;
};

type RoundManifestItem = {
  round: number;
  title: string;
};

const ROUNDS = 12;
const DATA_DIR = join(process.cwd(), "data");

function loadManifest(): Map<number, RoundManifestItem> {
  const path = join(DATA_DIR, "manifest.json");
  if (!existsSync(path)) return new Map();
  const parsed = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(parsed)) return new Map();
  return new Map(
    parsed
      .filter((item): item is RoundManifestItem =>
        Number.isInteger(item?.round) && typeof item?.title === "string"
      )
      .map((item) => [item.round, item])
  );
}

function loadRound(n: number): RawQuestion[] | null {
  const path = join(DATA_DIR, `round-${n}.json`);
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(parsed)) throw new Error(`round-${n}.json 은 배열이어야 합니다.`);
  return parsed as RawQuestion[];
}

function validate(n: number, items: RawQuestion[]) {
  const seen = new Set<string>();
  for (const q of items) {
    if (!SUBJECTS.includes(q.subject))
      throw new Error(`round-${n}: 잘못된 subject "${q.subject}" (문항 ${q.number})`);
    if (!Number.isInteger(q.number))
      throw new Error(`round-${n}: number가 정수가 아님`);
    if (!q.body?.trim()) throw new Error(`round-${n}: 문항 ${q.number} body 없음`);
    if (!Array.isArray(q.choices) || q.choices.length < 2)
      throw new Error(`round-${n}: 문항 ${q.number} choices 부족`);
    if (!Number.isInteger(q.answer) || q.answer < 1 || q.answer > q.choices.length)
      throw new Error(`round-${n}: 문항 ${q.number} answer 범위 오류 (${q.answer})`);
    const key = `${q.subject}:${q.number}`;
    if (seen.has(key)) throw new Error(`round-${n}: 중복 문항 ${key}`);
    seen.add(key);
  }
}

async function main() {
  if (process.env.ALLOW_DB_RESET !== "true") {
    throw new Error(
      "db:import deletes existing exams and cascades attempts/responses. Set ALLOW_DB_RESET=true to continue."
    );
  }

  const manifest = loadManifest();
  // 기존 시험 전부 삭제 (questions/attempts/responses cascade)
  await db.delete(exams);
  console.log("기존 시험 삭제 완료");

  let totalQ = 0;
  for (let n = 1; n <= ROUNDS; n++) {
    const items = loadRound(n);
    if (!items) {
      console.log(`round-${n}.json 없음 — 건너뜀`);
      continue;
    }
    validate(n, items);

    const [exam] = await db
      .insert(exams)
      .values({ title: manifest.get(n)?.title ?? `${n}회차 모의고사`, published: true })
      .returning();

    await db.insert(questions).values(
      items.map((q) => ({
        examId: exam.id,
        subject: q.subject,
        number: q.number,
        body: q.body,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation ?? null,
        imageUrl: q.imageUrl ?? null,
      }))
    );
    totalQ += items.length;
    console.log(`${n}회차: 문항 ${items.length}개 등록`);
  }

  console.log(`완료 — 총 문항 ${totalQ}개`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
