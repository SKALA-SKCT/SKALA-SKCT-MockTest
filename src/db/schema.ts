import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const SUBJECTS = [
  "언어이해",
  "자료해석",
  "창의수리",
  "언어추리",
  "수열추리",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SECTION_MINUTES = 15;

export type SectionState = Partial<
  Record<Subject, { startedAt: string; finishedAt?: string }>
>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    subject: text("subject").$type<Subject>().notNull(),
    number: integer("number").notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    choices: jsonb("choices").$type<string[]>().notNull(),
    answer: integer("answer").notNull(), // 1-based index into choices
    explanation: text("explanation"),
  },
  (t) => [uniqueIndex("uq_question").on(t.examId, t.subject, t.number)]
);

export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    sectionState: jsonb("section_state").$type<SectionState>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  // 유저·시험별 응시 기록
  (t) => [index("idx_attempt_user_exam").on(t.userId, t.examId)]
);

export const responses = pgTable(
  "responses",
  {
    id: serial("id").primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    choice: integer("choice"), // 1-based, null = 무응답
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (t) => [uniqueIndex("uq_response").on(t.attemptId, t.questionId)]
);
