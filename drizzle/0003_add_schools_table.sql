CREATE TYPE "public"."school_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"phone" text,
	"email" text,
	"website" text,
	"logo_url" text,
	"status" "school_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schools_code_unique" UNIQUE("code")
);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "schools_code_lower_idx" ON "schools" USING btree (lower("code"));--> statement-breakpoint
CREATE INDEX "schools_status_idx" ON "schools" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schools_code_idx" ON "schools" USING btree ("code");--> statement-breakpoint
CREATE INDEX "schools_created_at_id_idx" ON "schools" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "schools_deleted_at_idx" ON "schools" USING btree ("deleted_at");--> statement-breakpoint
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON "schools"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
