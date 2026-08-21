import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { linkFocusClassName } from "@/components/links";
import { site } from "@/config/site";
import { fetchMessages } from "@/features/guestbook/server/db/client";
import { resolveGeoFromHeaders } from "@/features/guestbook/server/geo";
import { COUNTRIES_GEOJSON_URL } from "@/features/guestbook/globe-data";
import { GuestbookGlobe } from "@/features/guestbook/guestbook-globe";

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
  const [messages, requestHeaders] = await Promise.all([
    fetchMessages(),
    headers(),
  ]);
  const viewerLocation = resolveGeoFromHeaders(requestHeaders);

  return (
    <main className="bg-background fixed inset-0">
      <link
        rel="preload"
        href={COUNTRIES_GEOJSON_URL}
        as="fetch"
        crossOrigin="anonymous"
      />
      <GuestbookGlobe messages={messages} viewerLocation={viewerLocation} />

      <Link
        href="/"
        className={`${linkFocusClassName} absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-10 text-sm text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black dark:text-white/75 dark:decoration-white/30 dark:hover:text-white`}
      >
        Back
      </Link>
    </main>
  );
}
