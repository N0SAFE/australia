import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";

/**
 * Presentation video table - stores a single presentation video
 * Only one row should exist in this table at a time
 */
export const presentationVideo = pgTable("presentation_video", {
  id: text("id").primaryKey().default('singleton'), // Single row constraint
  filePath: text("file_path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  duration: integer("duration"), // in seconds
  width: integer("width"),
  height: integer("height"),
  thumbnailPath: text("thumbnail_path"),
  // Video processing fields
  isProcessed: boolean("is_processed").notNull().default(false),
  processingProgress: real("processing_progress").default(0),
  processingError: text("processing_error"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
