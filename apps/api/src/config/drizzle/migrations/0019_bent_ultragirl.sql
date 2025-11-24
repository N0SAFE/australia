ALTER TABLE "file" DROP CONSTRAINT "file_file_path_unique";--> statement-breakpoint
ALTER TABLE "file" ADD COLUMN "namespace" text NOT NULL;--> statement-breakpoint
ALTER TABLE "file" DROP COLUMN "file_path";