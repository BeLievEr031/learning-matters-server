CREATE TYPE "public"."teacher_assignment_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "teacher_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"grade_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"assigned_by" uuid,
	"status" "teacher_assignment_status" DEFAULT 'active' NOT NULL,
	"effective_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_assignments_unique_idx" ON "teacher_assignments" USING btree ("teacher_id","grade_id","subject_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_school_id_idx" ON "teacher_assignments" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_teacher_id_idx" ON "teacher_assignments" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_grade_id_idx" ON "teacher_assignments" USING btree ("grade_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_subject_id_idx" ON "teacher_assignments" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_status_idx" ON "teacher_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teacher_assignments_assigned_by_idx" ON "teacher_assignments" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "teacher_assignments_created_at_id_idx" ON "teacher_assignments" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "teacher_assignments_deleted_at_idx" ON "teacher_assignments" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_teacher_assignments_updated_at
    BEFORE UPDATE ON "teacher_assignments"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
