import {
  pgSchema,
  text,
  timestamp,
  integer,
  uuid,
  type PgColumnBuilderBase,
} from "drizzle-orm/pg-core";

// Create a dedicated schema for content types
export const contentSchema = pgSchema("content");

// Base content configuration function with proper type safety
function contentBase<
  T extends string,
  TAdditionalColumns extends Record<string, PgColumnBuilderBase>
>(type: T, additionalColumns: TAdditionalColumns) {
  return contentSchema.table(`${type}_content`, {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull().default(type),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ...additionalColumns,
  });
}

// Text content - stores markdown or plain text
export const textContent = contentBase("text", {
  textContent: text("text_content").notNull(),
});

// Image content - stores uploaded images
export const imageContent = contentBase("image", {
  filePath: text("file_path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
});

// Video content - stores uploaded videos
export const videoContent = contentBase("video", {
  filePath: text("file_path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  duration: integer("duration"), // in seconds
  width: integer("width"),
  height: integer("height"),
  thumbnailPath: text("thumbnail_path"),
});

// Audio content - stores uploaded audio files
export const audioContent = contentBase("audio", {
  filePath: text("file_path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  duration: integer("duration"), // in seconds
  artist: text("artist"),
  title: text("title"),
});
