CREATE TABLE "capsule_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capsule_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"content_media_id" text NOT NULL,
	"type" text NOT NULL,
	"order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "capsule_media_content_media_id_unique" UNIQUE("content_media_id")
);
--> statement-breakpoint
ALTER TABLE "text_file" RENAME TO "raw_file";--> statement-breakpoint
ALTER TABLE "capsule_media" ADD CONSTRAINT "capsule_media_capsule_id_capsule_id_fk" FOREIGN KEY ("capsule_id") REFERENCES "public"."capsule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capsule_media" ADD CONSTRAINT "capsule_media_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;