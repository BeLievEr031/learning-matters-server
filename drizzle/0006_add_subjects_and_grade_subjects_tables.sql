CREATE TYPE "public"."subject_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."grade_subject_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"status" "subject_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "grade_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"grade_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"status" "grade_subject_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_subjects" ADD CONSTRAINT "grade_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_school_code_lower_idx" ON "subjects" USING btree ("school_id",lower("code"));--> statement-breakpoint
CREATE INDEX "subjects_school_id_idx" ON "subjects" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "subjects_status_idx" ON "subjects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subjects_code_idx" ON "subjects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "subjects_created_at_id_idx" ON "subjects" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "subjects_deleted_at_idx" ON "subjects" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_subjects_grade_subject_idx" ON "grade_subjects" USING btree ("grade_id","subject_id");--> statement-breakpoint
CREATE INDEX "grade_subjects_school_id_idx" ON "grade_subjects" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "grade_subjects_grade_id_idx" ON "grade_subjects" USING btree ("grade_id");--> statement-breakpoint
CREATE INDEX "grade_subjects_subject_id_idx" ON "grade_subjects" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "grade_subjects_status_idx" ON "grade_subjects" USING btree ("status");--> statement-breakpoint
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON "subjects"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER update_grade_subjects_updated_at
    BEFORE UPDATE ON "grade_subjects"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
