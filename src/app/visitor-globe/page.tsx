import { permanentRedirect } from "next/navigation";

export default async function LegacyGuestbookPage() {
  permanentRedirect("/guestbook");
}
