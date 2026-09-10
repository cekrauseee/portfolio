import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { database } from "@/db/client";
import { guestbookMessages } from "@/db/schema";
import {
  encodeGuestbookCursor,
  GUESTBOOK_PAGE_SIZE,
  type GuestbookCursor,
  type GuestbookMessage,
  type GuestbookSubmission,
} from "./contract";

function requireDatabase() {
  const client = database();
  if (!client) {
    throw new Error("Guestbook database is not configured.");
  }
  return client;
}
export type StoredGuestbookMessage = typeof guestbookMessages.$inferSelect;
export function publicGuestbookMessage(
  row: StoredGuestbookMessage,
): GuestbookMessage {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}
export async function listGuestbookMessages(cursor: GuestbookCursor | null) {
  const rows = await requireDatabase()
    .select()
    .from(guestbookMessages)
    .where(
      and(
        isNull(guestbookMessages.hiddenAt),
        cursor
          ? sql`(${guestbookMessages.createdAt}, ${guestbookMessages.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(guestbookMessages.createdAt), desc(guestbookMessages.id))
    .limit(GUESTBOOK_PAGE_SIZE + 1);
  const messages = rows
    .slice(0, GUESTBOOK_PAGE_SIZE)
    .map(publicGuestbookMessage);
  return {
    messages,
    nextCursor:
      rows.length > GUESTBOOK_PAGE_SIZE
        ? encodeGuestbookCursor(messages[messages.length - 1])
        : null,
  };
}
export async function findGuestbookSubmission(submissionKey: string) {
  const [row] = await requireDatabase()
    .select()
    .from(guestbookMessages)
    .where(eq(guestbookMessages.submissionKey, submissionKey))
    .limit(1);
  return row ?? null;
}
export async function insertGuestbookMessage(
  input: GuestbookSubmission,
  submissionKey: string,
) {
  const [row] = await requireDatabase()
    .insert(guestbookMessages)
    .values({ name: input.name, message: input.message, submissionKey })
    .onConflictDoNothing({ target: guestbookMessages.submissionKey })
    .returning();
  // A competing retry may have committed first. The caller checks its payload.
  return row ?? (await findGuestbookSubmission(submissionKey));
}
