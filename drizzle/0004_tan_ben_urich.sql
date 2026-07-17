ALTER TABLE "users" ADD COLUMN "campus" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "class_number" integer;--> statement-breakpoint
UPDATE "users" SET "campus" = '판교' WHERE "campus" IS NULL;--> statement-breakpoint
UPDATE "users" SET "class_number" = 1 WHERE "class_number" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "campus" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "class_number" SET NOT NULL;
