/**
 * data/manifest.json과 data/round-N.json을 읽어 모의고사를 DB에 반영한다.
 * 기본 실행은 기존 시험/응시 기록을 보존하고, 아직 없는 시험만 추가한다.
 * ALLOW_DB_RESET=true일 때만 기존 시험(및 응시 기록)을 삭제하고 다시 만든다.
 *
 *   npm run db:import
 *   ALLOW_DB_RESET=true npm run db:import:reset
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
import { and, eq, sql } from "drizzle-orm";
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
  const manifest = loadManifest();
  const selectedRounds = new Set(
    (process.env.IMPORT_ROUNDS ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isInteger),
  );
  const rounds = [...manifest.values()]
    .filter((item) => selectedRounds.size === 0 || selectedRounds.has(item.round))
    .sort((a, b) => a.round - b.round);
  if (rounds.length === 0) {
    throw new Error("data/manifest.json에 반영할 회차가 없습니다.");
  }

  const reset = process.env.ALLOW_DB_RESET === "true";
  const updateExisting = process.env.UPDATE_EXISTING_EXAMS === "true";
  if (reset) {
    // questions/attempts/responses가 cascade되므로 명시적으로 허용한 경우에만 실행한다.
    await db.delete(exams);
    console.log("기존 시험 삭제 완료");
  }

  let totalQ = 0;
  let addedExams = 0;
  for (const item of rounds) {
    const n = item.round;
    const items = loadRound(n);
    if (!items) {
      console.log(`round-${n}.json 없음 — 건너뜀`);
      continue;
    }
    validate(n, items);

    if (!reset) {
      const [existing] = await db
        .select({
          id: exams.id,
          questionCount: sql<number>`count(${questions.id})::int`,
        })
        .from(exams)
        .leftJoin(questions, eq(questions.examId, exams.id))
        .where(eq(exams.title, item.title))
        .groupBy(exams.id)
        .limit(1);

      if (existing) {
        if (existing.questionCount !== items.length) {
          throw new Error(
            `${item.title}: DB 문항 ${existing.questionCount}개, 파일 문항 ${items.length}개로 불일치`
          );
        }
        if (updateExisting) {
          await db.transaction(async (tx) => {
            for (const q of items) {
              const updated = await tx
                .update(questions)
                .set({
                  body: q.body,
                  choices: q.choices,
                  answer: q.answer,
                  explanation: q.explanation ?? null,
                  imageUrl: q.imageUrl ?? null,
                })
                .where(
                  and(
                    eq(questions.examId, existing.id),
                    eq(questions.subject, q.subject),
                    eq(questions.number, q.number),
                  ),
                )
                .returning({ id: questions.id });
              if (updated.length !== 1) {
                throw new Error(`${item.title}: ${q.subject} ${q.number}번 갱신 대상이 ${updated.length}개입니다.`);
              }
            }
          });
          totalQ += items.length;
          console.log(`${item.title}: 기존 문항 ${items.length}개 갱신`);
          continue;
        }
        console.log(`${item.title}: 이미 등록됨 — 건너뜀`);
        continue;
      }
    }

    await db.transaction(async (tx) => {
      const [exam] = await tx
        .insert(exams)
        .values({ title: item.title, published: true })
        .returning();

      await tx.insert(questions).values(
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
    });
    addedExams += 1;
    totalQ += items.length;
    console.log(`${item.title}: 문항 ${items.length}개 등록`);
  }

  console.log(`완료 — 시험 ${addedExams}개, 문항 ${totalQ}개 추가`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
