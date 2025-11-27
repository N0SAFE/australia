import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";
import { capsule } from "./capsule";
import { file } from "./file";

/**
 * Junction table linking capsules to their media files
 * Enables direct capsule → media relationship without parsing content
 * 
 * Key features:
 * - contentMediaId links content nodes to media records
 * - Cascade delete removes orphaned media when capsule is deleted
 * - Type field for quick filtering by media type
 * - Order field for potential future sorting
 */
export const capsuleMedia = pgTable("capsule_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Foreign keys with cascade delete
  capsuleId: uuid("capsule_id")
    .references(() => capsule.id, { onDelete: 'cascade' })
    .notNull(),
  fileId: uuid("file_id")
    .references(() => file.id, { onDelete: 'cascade' })
    .notNull(),
  
  // Content node linking
  contentMediaId: text("content_media_id").notNull().unique(), // UUID generated on client, embedded in content nodes
  
  // Media type for quick filtering
  type: text("type", { enum: ['image', 'video', 'audio'] }).notNull(),
  
  // Ordering (for future use)
  order: integer("order"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
