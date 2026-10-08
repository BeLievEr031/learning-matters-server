CREATE TYPE "public"."teacher_status" AS ENUM('active', 'inactive', 'on_leave', 'terminated');--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid,
	"employee_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"joining_date" timestamp with time zone,
	"qualification" text,
	"status" "teacher_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_school_employee_id_lower_idx" ON "teachers" USING btree ("school_id",lower("employee_id"));--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_school_email_lower_idx" ON "teachers" USING btree ("school_id",lower("email"));--> statement-breakpoint
CREATE INDEX "teachers_school_id_idx" ON "teachers" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "teachers_status_idx" ON "teachers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teachers_user_id_idx" ON "teachers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teachers_created_at_id_idx" ON "teachers" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "teachers_deleted_at_idx" ON "teachers" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON "teachers"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
