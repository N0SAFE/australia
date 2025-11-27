import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { file } from "./file";

/**
 * Presentation video table - stores a reference to the presentation video file
 * Only one row should exist in this table at a time
 * 
 * This table acts as a singleton pointer to the current presentation video.
 * All file metadata is stored in the file table and its related type-specific tables.
 */
export const presentationVideo = pgTable("presentation_video", {
  id: text("id").primaryKey().default('singleton'), // Single row constraint
  
  // Foreign key to file table
  fileId: uuid("file_id").notNull().references(() => file.id, { onDelete: 'cascade' }),
  
  // Timestamps
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
