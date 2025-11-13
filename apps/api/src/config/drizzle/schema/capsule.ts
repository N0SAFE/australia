import { pgTable, text, timestamp, jsonb, boolean, uuid } from "drizzle-orm/pg-core";

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
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
