CREATE TYPE "public"."grade_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"grade_number" integer NOT NULL,
	"section" text,
	"capacity" integer,
	"status" "grade_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "grades_board_grade_section_idx" ON "grades" USING btree ("board_id","grade_number",coalesce("section", ''));--> statement-breakpoint
CREATE INDEX "grades_school_id_idx" ON "grades" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "grades_board_id_idx" ON "grades" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "grades_status_idx" ON "grades" USING btree ("status");--> statement-breakpoint
CREATE INDEX "grades_grade_number_idx" ON "grades" USING btree ("grade_number");--> statement-breakpoint
CREATE INDEX "grades_created_at_id_idx" ON "grades" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "grades_deleted_at_idx" ON "grades" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_grades_updated_at
    BEFORE UPDATE ON "grades"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
