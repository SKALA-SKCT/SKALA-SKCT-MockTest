CREATE INDEX "idx_attempt_exam_finished" ON "attempts" USING btree ("exam_id","finished_at");--> statement-breakpoint
CREATE INDEX "idx_question_exam" ON "questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "idx_response_question" ON "responses" USING btree ("question_id");