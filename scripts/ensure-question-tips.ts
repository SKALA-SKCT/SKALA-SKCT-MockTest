import { config } from "dotenv";

async function main() {
  config({ path: ".env.local", quiet: true });
  const { ensureQuestionTipsSchema } = await import("../src/db/ensure-question-tips");
  const { db } = await import("../src/db");
  try {
    await ensureQuestionTipsSchema();
    console.log("풀이팁 테이블과 신고 필드 준비 완료");
  } finally { await db.$client.end(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
