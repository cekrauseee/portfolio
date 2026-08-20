import { permanentRedirect } from "next/navigation";

export default function NewMessagePage() {
  permanentRedirect("/guestbook/new");
}
