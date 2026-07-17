ALTER TABLE "users" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "users" SET "name" = "nickname" WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
