import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { linkFocusClassName } from "@/components/links";
import { PreferencesMenu } from "@/components/preferences-menu";
import { fetchMessages } from "@/features/guestbook/server/db/client";
import { resolveGeoFromHeaders } from "@/features/guestbook/server/geo";
import { COUNTRIES_GEOJSON_URL } from "@/features/guestbook/globe-data";
import { GuestbookGlobe } from "@/features/guestbook/guestbook-globe";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/request-locale";
import { requestMetadata } from "@/i18n/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
  return requestMetadata(
    locale,
    "/guestbook",
    dictionary.guestbook.title,
    dictionary.guestbook.description,
  );
}

export default async function GuestbookPage() {
  const locale = await getRequestLocale();
  const dictionary = await getDictionary(locale);
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
      <GuestbookGlobe
        messages={messages}
        viewerLocation={viewerLocation}
        locale={locale}
        dictionary={dictionary.guestbook}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 pt-[calc(1rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]">
        <Link
          href="/"
          className={`${linkFocusClassName} pointer-events-auto min-h-8 min-w-0 shrink content-center text-sm text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black dark:text-white/75 dark:decoration-white/30 dark:hover:text-white`}
        >
          {dictionary.guestbook.back}
        </Link>

        <div className="pointer-events-auto shrink-0">
          <PreferencesMenu
            key={locale}
            locale={locale}
            dictionary={dictionary.navigation}
          />
        </div>
      </header>
    </main>
  );
}
