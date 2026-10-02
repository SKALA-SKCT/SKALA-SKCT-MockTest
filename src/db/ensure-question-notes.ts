import { sql } from "drizzle-orm";
import { db } from "@/db";

const globalForNotes = globalThis as typeof globalThis & {
  questionNotesSchema?: Promise<void>;
};

export function ensureQuestionNotesSchema() {
  globalForNotes.questionNotesSchema ??= (async () => {
    await db.execute(sql`
      create table if not exists question_notes (
        id serial primary key,
        user_id integer not null references users(id) on delete cascade,
        question_id integer not null references questions(id) on delete cascade,
        text text not null default '',
        drawing text,
        updated_at timestamptz not null default now()
      )
    `);
    await db.execute(sql`create unique index if not exists uq_question_note on question_notes(user_id, question_id)`);
    await db.execute(sql`alter table question_notes enable row level security`);
  })().catch((error) => {
    globalForNotes.questionNotesSchema = undefined;
    throw error;
  });

  return globalForNotes.questionNotesSchema;
}
