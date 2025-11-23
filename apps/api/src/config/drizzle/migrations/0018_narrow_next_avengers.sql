ALTER TABLE "presentation_video" ADD COLUMN "file_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "presentation_video" ADD CONSTRAINT "presentation_video_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "file_path";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "filename";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "mime_type";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "size";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "duration";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "width";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "height";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "thumbnail_path";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "is_processed";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "processing_progress";--> statement-breakpoint
ALTER TABLE "presentation_video" DROP COLUMN "processing_error";