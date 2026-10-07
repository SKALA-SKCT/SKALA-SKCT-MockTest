import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureQuestionReportsSchema } from "@/db/ensure-question-reports";

const globalForTips = globalThis as typeof globalThis & { questionTipsSchema?: Promise<void> };
export function ensureQuestionTipsSchema() {
  globalForTips.questionTipsSchema ??= (async () => {
    await ensureQuestionReportsSchema();
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(710012)`);
      await tx.execute(sql`create table if not exists question_tips (
        id serial primary key,
        question_id integer not null references questions(id) on delete cascade,
        user_id integer not null references users(id) on delete cascade,
        text text not null check (length(btrim(text)) > 0 and length(text) <= 1000),
        created_at timestamptz not null default now()
      )`);
      await tx.execute(sql`create index if not exists idx_question_tips_question on question_tips(question_id, created_at)`);
      await tx.execute(sql`create index if not exists idx_question_tips_user on question_tips(user_id)`);
      await tx.execute(sql`create table if not exists question_tip_likes (
        tip_id integer not null references question_tips(id) on delete cascade,
        user_id integer not null references users(id) on delete cascade
      )`);
      await tx.execute(sql`create unique index if not exists uq_question_tip_like on question_tip_likes(tip_id, user_id)`);
      await tx.execute(sql`create index if not exists idx_question_tip_likes_user on question_tip_likes(user_id)`);
      await tx.execute(sql`alter table question_reports add column if not exists tip_id integer references question_tips(id) on delete set null`);
      await tx.execute(sql`alter table question_reports add column if not exists tip_text text`);
      await tx.execute(sql`alter table question_reports add column if not exists tip_author text`);
      await tx.execute(sql`create unique index if not exists uq_question_tip_report on question_reports(tip_id, reporter_id)`);
      await tx.execute(sql`alter table question_tips enable row level security`);
      await tx.execute(sql`alter table question_tip_likes enable row level security`);
    });
  })().catch((error) => { globalForTips.questionTipsSchema = undefined; throw error; });
  return globalForTips.questionTipsSchema;
}
