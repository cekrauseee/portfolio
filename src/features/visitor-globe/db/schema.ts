import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Public messages left by visitors and pinned to the globe by server-side
 * IP geolocation. Messages are persisted only after the moderation guardrail
 * approves them. Visitors cannot delete their own messages.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    message: text("message").notNull(),
    latitude: text("latitude").notNull(),
    longitude: text("longitude").notNull(),
    country: text("country"),
    city: text("city"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_created_at_idx").on(table.createdAt)],
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
