ALTER TABLE "passkey" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "passkey" CASCADE;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");

-- Migration: Add CHECK constraint to prevent empty MIME types
-- Created: 2025-01-XX
-- Purpose: Ensure mimeType column cannot be empty string

-- Add CHECK constraint to file table to prevent empty mime_type
ALTER TABLE "file" 
ADD CONSTRAINT "file_mime_type_not_empty" 
CHECK (mime_type IS NOT NULL AND length(trim(mime_type)) > 0);

-- Add comment for documentation
COMMENT ON CONSTRAINT "file_mime_type_not_empty" ON "file" 
IS 'Ensures MIME type cannot be NULL or empty string';
