import type { Metadata } from "next";
import Link from "next/link";
import { linkFocusClassName } from "@/components/links";
import { site } from "@/config/site";
import { fetchMessages } from "@/features/visitor-globe/db/client";
import { VisitorGlobe } from "@/features/visitor-globe/visitor-globe";

const path = "/guestbook";
const title = "Visitor guestbook";
const description =
  "Leave a message on the globe. Visitors from everywhere appear as points of light.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    type: "website",
    url: path,
    title,
    description,
    siteName: site.name,
    locale: site.locale,
  },
};

export const dynamic = "force-dynamic";

export default async function GuestbookPage() {
  const messages = await fetchMessages();

  return (
    <main className="bg-background fixed inset-0">
      <VisitorGlobe messages={messages} />

      <Link
        href="/"
        className={`${linkFocusClassName} absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-10 text-sm text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black dark:text-white/75 dark:decoration-white/30 dark:hover:text-white`}
      >
        Back
      </Link>
    </main>
  );
}
