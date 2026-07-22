ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "time_spent_seconds" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "question_started_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "answered_at" timestamp with time zone;
