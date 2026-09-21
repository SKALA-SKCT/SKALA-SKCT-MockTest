import { sql } from "drizzle-orm";
import { db } from "@/db";

const globalForReports = globalThis as typeof globalThis & {
  questionReportsSchema?: Promise<void>;
};

export function ensureQuestionReportsSchema() {
  globalForReports.questionReportsSchema ??= (async () => {
    await db.execute(sql`
      do $$ begin
        create type question_report_status as enum ('pending', 'resolved', 'rejected');
      exception
        when duplicate_object then null;
      end $$
    `);
    await db.execute(sql`
      create table if not exists question_reports (
        id serial primary key,
        question_id integer not null references questions(id) on delete cascade,
        reporter_id integer not null references users(id) on delete cascade,
        reasons jsonb not null,
        detail text,
        status question_report_status not null default 'pending',
        admin_note text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);
    await db.execute(sql`create index if not exists idx_question_reports_status on question_reports(status, created_at)`);
    await db.execute(sql`create index if not exists idx_question_reports_question on question_reports(question_id)`);
    await db.execute(sql`create index if not exists idx_question_reports_reporter on question_reports(reporter_id)`);
    await db.execute(sql`alter table question_reports enable row level security`);
  })().catch((error) => {
    globalForReports.questionReportsSchema = undefined;
    throw error;
  });

  return globalForReports.questionReportsSchema;
}
