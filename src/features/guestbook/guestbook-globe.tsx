"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { actionClassName, actionSoundProps } from "@/components/links";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import type {
  GeoCoordinates,
  GuestbookMessage,
} from "@/features/guestbook/message";
import { COUNTRIES_GEOJSON_URL } from "@/features/guestbook/globe-data";
import type { GeoJSON } from "@/features/guestbook/globe/geometry";

const Globe = dynamic(
  () => import("@/features/guestbook/globe/globe").then((m) => m.Globe),
  {
    ssr: false,
    loading: () => null,
  },
);

function GlobePlaceholder({
  hidden,
  dictionary,
}: {
  hidden: boolean;
  dictionary: Dictionary["guestbook"]["globe"];
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${hidden ? "opacity-0" : "opacity-100"}`}
      role={hidden ? undefined : "status"}
      aria-hidden={hidden || undefined}
    >
      <div className="size-[min(66vmin,38rem)] rounded-full bg-black/[0.035] outline outline-black/[0.06] motion-safe:animate-pulse dark:bg-white/[0.035] dark:outline-white/[0.08]" />
      <span className="sr-only">{dictionary.loading}</span>
    </div>
  );
}

export function GuestbookGlobe({
  messages,
  viewerLocation,
  locale,
  dictionary,
}: {
  messages: GuestbookMessage[];
  viewerLocation: GeoCoordinates | null;
  locale: Locale;
  dictionary: Dictionary["guestbook"];
}) {
  const [geojson, setGeojson] = useState<GeoJSON | null | undefined>(undefined);
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    // Start both large resources together instead of waiting for the map before
    // requesting the WebGL bundle.
    void import("@/features/guestbook/globe/globe");
    fetch(COUNTRIES_GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<GeoJSON>;
      })
      .then(setGeojson)
      .catch(() => setGeojson(null));
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        className={`absolute inset-0 ${globeReady ? "opacity-100" : "opacity-0"}`}
      >
        {geojson !== undefined ? (
          <Globe
            messages={messages}
            geojson={geojson ?? undefined}
            viewerLocation={viewerLocation}
            onReady={() => setGlobeReady(true)}
            locale={locale}
            dictionary={dictionary.globe}
            primaryAction={
              <Link
                {...actionSoundProps}
                href="/guestbook/new"
                className={`${actionClassName} min-h-10 py-2.5`}
              >
                {dictionary.globe.leaveMessage}
              </Link>
            }
          />
        ) : null}
      </div>
      <GlobePlaceholder hidden={globeReady} dictionary={dictionary.globe} />
      {geojson === null ? (
        <p
          className="pointer-events-none absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 text-center text-sm text-black/60 dark:text-white/65"
          role="status"
        >
          {dictionary.globe.loadBordersError}
        </p>
      ) : null}
    </div>
  );
}
