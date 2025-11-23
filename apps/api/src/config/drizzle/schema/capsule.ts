import { pgTable, text, timestamp, jsonb, boolean, uuid, integer } from "drizzle-orm/pg-core";

export const capsule = pgTable("capsule", {
  id: uuid("id").primaryKey().defaultRandom(),
  openingDate: text("opening_date").notNull(),
  
  // Plate.js content stored as JSON
  content: text("content").notNull(), // Stores Plate.js Value as JSON string
  
  openingMessage: text("opening_message"),
  
  // Lock mechanism
  isLocked: boolean("is_locked").notNull().default(false),
  lockType: text("lock_type"), // code, voice, device_shake, api, etc.
  lockConfig: jsonb("lock_config"), // Configuration for the lock (code value, voice phrase, API endpoint, etc.)
  unlockedAt: timestamp("unlocked_at"), // When the capsule was unlocked
  openedAt: timestamp("opened_at"), // When the capsule was first viewed/opened
  
  // Background upload/processing status
  uploadStatus: text("upload_status"), // 'uploading', 'processing', 'completed', 'failed'
  uploadProgress: integer("upload_progress"), // 0-100
  uploadMessage: text("upload_message"), // Current status message
  operationId: text("operation_id"), // Operation ID for tracking progress
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
