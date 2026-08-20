import { permanentRedirect } from "next/navigation";

export default async function VisitorGlobePage() {
  permanentRedirect("/guestbook");
}
