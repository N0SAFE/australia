ALTER TABLE "presentation_video" ADD COLUMN "is_processed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "presentation_video" ADD COLUMN "processing_progress" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "presentation_video" ADD COLUMN "processing_error" text;