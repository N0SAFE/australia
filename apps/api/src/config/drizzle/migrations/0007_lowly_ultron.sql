CREATE SCHEMA "content";
--> statement-breakpoint
CREATE TABLE "content"."audio_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'audio' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"file_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"duration" integer,
	"artist" text,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "content"."image_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'image' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"file_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text
);
--> statement-breakpoint
CREATE TABLE "content"."text_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"text_content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."video_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'video' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"file_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"duration" integer,
	"width" integer,
	"height" integer,
	"thumbnail_path" text
);
--> statement-breakpoint
ALTER TABLE "capsule" ALTER COLUMN "id" SET DATA TYPE uuid USING id::uuid;--> statement-breakpoint
ALTER TABLE "capsule" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "capsule" ALTER COLUMN "content_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "capsule" ADD COLUMN "content_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "capsule" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "capsule" DROP COLUMN "content_metadata";