CREATE TYPE "public"."material_type" AS ENUM('document', 'worksheet', 'presentation', 'video_link', 'reference_link');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('lecture_note', 'revision_summary', 'handwritten_note', 'study_guide');--> statement-breakpoint
CREATE TABLE "chapter_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"material_type" "material_type" DEFAULT 'document' NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"external_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "chapter_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"note_type" "note_type" DEFAULT 'lecture_note' NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "chapter_materials" ADD CONSTRAINT "chapter_materials_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_materials" ADD CONSTRAINT "chapter_materials_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_materials" ADD CONSTRAINT "chapter_materials_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_materials" ADD CONSTRAINT "chapter_materials_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_notes" ADD CONSTRAINT "chapter_notes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_notes" ADD CONSTRAINT "chapter_notes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_notes" ADD CONSTRAINT "chapter_notes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_notes" ADD CONSTRAINT "chapter_notes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_materials_school_id_idx" ON "chapter_materials" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "chapter_materials_chapter_id_idx" ON "chapter_materials" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "chapter_materials_subject_id_idx" ON "chapter_materials" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "chapter_materials_teacher_id_idx" ON "chapter_materials" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "chapter_materials_created_at_id_idx" ON "chapter_materials" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "chapter_materials_deleted_at_idx" ON "chapter_materials" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "chapter_notes_school_id_idx" ON "chapter_notes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "chapter_notes_chapter_id_idx" ON "chapter_notes" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "chapter_notes_subject_id_idx" ON "chapter_notes" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "chapter_notes_teacher_id_idx" ON "chapter_notes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "chapter_notes_is_published_idx" ON "chapter_notes" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "chapter_notes_created_at_id_idx" ON "chapter_notes" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "chapter_notes_deleted_at_idx" ON "chapter_notes" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_chapter_materials_updated_at
    BEFORE UPDATE ON "chapter_materials"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER update_chapter_notes_updated_at
    BEFORE UPDATE ON "chapter_notes"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
