import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const guestbookMessages = pgTable(
  'guestbook_messages',
  {
    id: uuid().defaultRandom().primaryKey(),
    name: text().notNull(),
    message: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).defaultNow().notNull(),
    hiddenAt: timestamp('hidden_at', { withTimezone: true, precision: 3 }),
    // Private retry key, unrelated to the public message ID or remembered name.
    submissionKey: text('submission_key').notNull().unique(),
  },
  (table) => [
    index('guestbook_messages_visible_created_id_idx')
      .on(table.createdAt.desc(), table.id.desc())
      .where(sql`${table.hiddenAt} is null`),
    check('guestbook_name_length', sql`char_length(btrim(${table.name})) between 1 and 80`),
    check('guestbook_message_length', sql`char_length(btrim(${table.message})) between 1 and 500`),
  ],
)
