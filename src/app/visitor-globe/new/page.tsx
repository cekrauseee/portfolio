import { permanentRedirect } from "next/navigation";

export default function LegacyNewMessagePage() {
  permanentRedirect("/guestbook/new");
}
