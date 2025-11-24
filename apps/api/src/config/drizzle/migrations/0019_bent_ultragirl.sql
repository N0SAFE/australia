-- Step 1: Drop the unique constraint on file_path
ALTER TABLE "file" DROP CONSTRAINT "file_file_path_unique";--> statement-breakpoint

-- Step 2: Add namespace column as nullable first
ALTER TABLE "file" ADD COLUMN "namespace" text;--> statement-breakpoint

-- Step 3: Update existing rows with appropriate namespace based on file type or usage
-- For now, default to 'storage' as a safe fallback
-- Note: If files were created through capsule uploads, they should have been in 'capsules' namespace
-- But since we don't have a reliable way to distinguish them from the old file_path,
-- we'll use 'storage' as the default and let the application handle any inconsistencies
UPDATE "file" SET "namespace" = 'storage' WHERE "namespace" IS NULL;--> statement-breakpoint

-- Step 4: Make namespace NOT NULL now that all rows have values
ALTER TABLE "file" ALTER COLUMN "namespace" SET NOT NULL;--> statement-breakpoint

-- Step 5: Drop the old file_path column
ALTER TABLE "file" DROP COLUMN "file_path";