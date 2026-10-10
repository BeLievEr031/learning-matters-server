CREATE INDEX "users_school_role_idx" ON "users" USING btree ("school_id","role");--> statement-breakpoint
CREATE INDEX "users_school_status_idx" ON "users" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "schools_status_created_at_idx" ON "schools" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "boards_school_status_idx" ON "boards" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "grades_school_status_idx" ON "grades" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "grades_board_status_idx" ON "grades" USING btree ("board_id","status");--> statement-breakpoint
CREATE INDEX "subjects_school_status_idx" ON "subjects" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "grade_subjects_school_status_idx" ON "grade_subjects" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "grade_subjects_grade_status_idx" ON "grade_subjects" USING btree ("grade_id","status");--> statement-breakpoint
CREATE INDEX "teachers_school_status_idx" ON "teachers" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "students_school_status_idx" ON "students" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "students_board_status_idx" ON "students" USING btree ("board_id","status");--> statement-breakpoint
CREATE INDEX "teacher_assignments_school_status_idx" ON "teacher_assignments" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "teacher_assignments_teacher_status_idx" ON "teacher_assignments" USING btree ("teacher_id","status");--> statement-breakpoint
CREATE INDEX "teacher_assignments_grade_status_idx" ON "teacher_assignments" USING btree ("grade_id","status");
