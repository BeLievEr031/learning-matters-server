ALTER TABLE "grades" ADD COLUMN "class_teacher_id" uuid;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_class_teacher_id_teachers_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grades_class_teacher_id_idx" ON "grades" USING btree ("class_teacher_id");
