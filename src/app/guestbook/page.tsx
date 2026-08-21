import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { linkFocusClassName } from "@/components/links";
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

      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-[calc(1rem+env(safe-area-inset-right))] z-30">
        <LanguageSwitcher
          locale={locale}
          labels={dictionary.navigation.languages}
          label={dictionary.navigation.languageNavigation}
        />
      </div>

      <Link
        href="/"
        className={`${linkFocusClassName} absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-10 text-sm text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black dark:text-white/75 dark:decoration-white/30 dark:hover:text-white`}
      >
        {dictionary.guestbook.back}
      </Link>
    </main>
  );
}
