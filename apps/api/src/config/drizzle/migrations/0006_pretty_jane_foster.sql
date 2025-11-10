ALTER TABLE "capsule" ADD COLUMN "content_type" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "content_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "lock_type" text;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "lock_config" jsonb;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "unlocked_at" timestamp;