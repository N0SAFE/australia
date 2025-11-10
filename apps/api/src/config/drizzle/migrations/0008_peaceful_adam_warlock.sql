ALTER TABLE "capsule" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" DROP COLUMN "content_type";--> statement-breakpoint
ALTER TABLE "capsule" DROP COLUMN "content_id";