CREATE TYPE "public"."student_status" AS ENUM('active', 'inactive', 'transferred', 'graduated', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."student_gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"grade_id" uuid NOT NULL,
	"user_id" uuid,
	"admission_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" timestamp with time zone,
	"gender" "student_gender",
	"email" text,
	"phone" text,
	"guardian_name" text,
	"guardian_phone" text,
	"guardian_email" text,
	"address" text,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_admission_number_lower_idx" ON "students" USING btree ("school_id",lower("admission_number"));--> statement-breakpoint
CREATE INDEX "students_school_id_idx" ON "students" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "students_board_id_idx" ON "students" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "students_grade_id_idx" ON "students" USING btree ("grade_id");--> statement-breakpoint
CREATE INDEX "students_grade_status_idx" ON "students" USING btree ("grade_id","status");--> statement-breakpoint
CREATE INDEX "students_user_id_idx" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "students_created_at_id_idx" ON "students" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "students_deleted_at_idx" ON "students" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON "students"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
