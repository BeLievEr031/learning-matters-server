-- Migration: 0002 — Expand user_role enum to all 6 roles and add school context fields
-- BREAKING CHANGE: 'user' and 'admin' enum values are removed; replaced with 6-role hierarchy

-- Step 1: Rename the old enum so we can recreate it
ALTER TYPE "public"."user_role" RENAME TO "user_role_old";--> statement-breakpoint

-- Step 2: Create the new enum with all 6 roles
CREATE TYPE "public"."user_role" AS ENUM(
  'super_admin',
  'admin',
  'principal',
  'class_teacher',
  'teacher',
  'student'
);--> statement-breakpoint

-- Step 3: Add new columns to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "school_id" uuid,
  ADD COLUMN IF NOT EXISTS "first_name" text,
  ADD COLUMN IF NOT EXISTS "last_name" text,
  ADD COLUMN IF NOT EXISTS "phone" text,
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';--> statement-breakpoint

-- Step 4: Add a temporary column with the new enum type
ALTER TABLE "users" ADD COLUMN "role_new" "user_role";--> statement-breakpoint

-- Step 5: Migrate existing data — map old values to new
UPDATE "users" SET "role_new" = CASE
  WHEN "role"::text = 'admin' THEN 'admin'::"user_role"
  ELSE 'student'::"user_role"
END;--> statement-breakpoint

-- Step 6: Make the new column NOT NULL with default, then drop old column
ALTER TABLE "users" ALTER COLUMN "role_new" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role_new" SET DEFAULT 'student';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "role_new" TO "role";--> statement-breakpoint

-- Step 7: Drop the old enum type
DROP TYPE "public"."user_role_old";--> statement-breakpoint

-- Step 8: Add index on school_id for scoped queries
CREATE INDEX IF NOT EXISTS "users_school_id_idx" ON "users" USING btree ("school_id");--> statement-breakpoint
