import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { Pool } from "pg";
import { LINKAREER_CATALOG } from "../src/db/linkareer-catalog";

config({ path: ".env.local", quiet: true });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const client = await pool.connect();
  try {
    await client.query("begin isolation level repeatable read");
    const { rows: before } = await client.query("select * from exams order by id for update");
    const { rows: questions } = await client.query("select * from questions order by id");
    for (const entry of LINKAREER_CATALOG) {
      const exam = before.find((exam) => exam.id === entry.round);
      assert.ok(exam && [entry.previousTitle, entry.title].includes(exam.title), `회차 ${entry.round} 제목 확인 필요`);
      assert.equal(questions.filter((q) => q.exam_id === entry.round).length, 100);
      if (entry.archived) {
        const answers = (id: number) => questions.filter((q) => q.exam_id === id)
          .sort((a, b) => a.number - b.number).map((q) => q.answer);
        assert.deepEqual(answers(entry.round), answers(entry.round + 3));
      }
    }
    if (!process.argv.includes("--apply")) {
      await client.query("rollback");
      console.log("17개 회차와 중복 300문항 검증 통과. --apply로 적용합니다.");
      return;
    }
    const backup = `/private/tmp/skct-exam-catalog-${Date.now()}.json`;
    writeFileSync(backup, JSON.stringify(before, null, 2), { mode: 0o600, flag: "wx" });
    for (const entry of LINKAREER_CATALOG.filter((entry) => entry.round >= 3 && entry.round <= 12)) {
      await client.query("update exams set title=$1, published=$2 where id=$3", [entry.title, !entry.archived, entry.round]);
    }
    assert.deepEqual((await client.query("select * from questions order by id")).rows, questions);
    const { rows: duplicates } = await client.query("select title from exams where published group by title having count(*) > 1");
    assert.equal(duplicates.length, 0);
    await client.query("commit");
    console.log(`회차 수정 완료. 원본 백업: ${backup}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
