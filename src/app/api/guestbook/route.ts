import {
  createGuestbookGet,
  createGuestbookPost,
} from "@/features/guestbook/handler";

export const runtime = "nodejs";
export const GET = createGuestbookGet();
export const POST = createGuestbookPost();
