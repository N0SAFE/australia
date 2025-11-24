CREATE TABLE "ts_migration" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"execution_time_ms" text
);
