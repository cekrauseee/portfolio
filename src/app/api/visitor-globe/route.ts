import { createGuestbookPost } from "@/features/guestbook/server/handler";

// Legacy public endpoint. Keep it as a compatibility adapter for existing clients.
export const runtime = "nodejs";
export const POST = createGuestbookPost();
