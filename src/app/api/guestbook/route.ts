import { createGuestbookPost } from "@/features/guestbook/server/handler";

export const runtime = "nodejs";
export const POST = createGuestbookPost();
