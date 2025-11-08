import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const capsule = pgTable("capsule", {
  id: text("id").primaryKey(),
  openingDate: text("opening_date").notNull(),
  content: text("content").notNull(),
  openingMessage: text("opening_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
