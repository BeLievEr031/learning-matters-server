CREATE TYPE "public"."principal_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "principals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" "principal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "principals" ADD CONSTRAINT "principals_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principals" ADD CONSTRAINT "principals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "principals_school_id_unique" ON "principals" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "principals_user_id_unique" ON "principals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "principals_school_id_idx" ON "principals" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "principals_status_idx" ON "principals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "principals_user_id_idx" ON "principals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "principals_created_at_id_idx" ON "principals" USING btree ("created_at","id");--> statement-breakpoint
CREATE TRIGGER update_principals_updated_at
    BEFORE UPDATE ON "principals"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
