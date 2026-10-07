CREATE TYPE "public"."board_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"status" "board_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_school_code_lower_idx" ON "boards" USING btree ("school_id",lower("code"));--> statement-breakpoint
CREATE INDEX "boards_school_id_idx" ON "boards" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "boards_status_idx" ON "boards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "boards_code_idx" ON "boards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "boards_created_at_id_idx" ON "boards" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "boards_deleted_at_idx" ON "boards" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON "boards"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
