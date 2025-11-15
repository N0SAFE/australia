CREATE TABLE "presentation_video" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"file_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"duration" integer,
	"width" integer,
	"height" integer,
	"thumbnail_path" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
