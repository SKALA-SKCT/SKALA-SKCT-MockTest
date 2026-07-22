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
  pgEnum,
} from "drizzle-orm/pg-core";

export const SUBJECTS = [
  "언어이해",
  "자료해석",
  "창의수리",
  "언어추리",
  "수열추리",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const CAMPUSES = ["판교", "울산", "광주"] as const;
export type Campus = (typeof CAMPUSES)[number];

export function maxClassForCampus(campus: Campus) {
  return campus === "판교" ? 10 : 4;
}

export const SECTION_MINUTES = 15;
export const tokenPurpose = pgEnum("token_purpose", [
  "email_verify",
  "find_id",
  "password_reset",
]);

export type SectionState = Partial<
  Record<Subject, { startedAt: string; finishedAt?: string }>
>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull().unique(),
  name: text("name").notNull(),
  campus: text("campus").$type<Campus>().notNull(),
  classNumber: integer("class_number").notNull(),
  email: text("email").unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  pinHash: text("pin_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: tokenPurpose("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_auth_tokens_hash").on(t.tokenHash),
    index("idx_auth_tokens_user_purpose").on(t.userId, t.purpose),
    index("idx_auth_tokens_email_purpose").on(t.email, t.purpose),
  ]
);

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
  (t) => [
    uniqueIndex("uq_question").on(t.examId, t.subject, t.number),
    index("idx_question_exam").on(t.examId),
  ]
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
  (t) => [
    index("idx_attempt_user_exam").on(t.userId, t.examId),
    index("idx_attempt_exam_finished").on(t.examId, t.finishedAt),
  ]
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
    timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
    questionStartedAt: timestamp("question_started_at", { withTimezone: true }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_response").on(t.attemptId, t.questionId),
    index("idx_response_question").on(t.questionId),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_chat_messages_created").on(t.createdAt),
    index("idx_chat_messages_user").on(t.userId),
  ]
);
