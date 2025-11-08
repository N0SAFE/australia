CREATE TABLE "capsule" (
	"id" text PRIMARY KEY NOT NULL,
	"opening_date" text NOT NULL,
	"content" text NOT NULL,
	"opening_message" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capsule" ADD CONSTRAINT "capsule_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;