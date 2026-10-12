CREATE TYPE "public"."chapter_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "chapter_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_subject_chapter_number_idx" ON "chapters" USING btree ("subject_id","chapter_number") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "chapters_school_id_idx" ON "chapters" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "chapters_subject_id_idx" ON "chapters" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "chapters_subject_status_idx" ON "chapters" USING btree ("subject_id","status");--> statement-breakpoint
CREATE INDEX "chapters_created_at_id_idx" ON "chapters" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "chapters_deleted_at_idx" ON "chapters" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_chapters_updated_at
    BEFORE UPDATE ON "chapters"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
