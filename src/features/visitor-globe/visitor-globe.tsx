"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { actionClassName } from "@/components/links";
import type { VisitorMessage } from "@/features/visitor-globe/db/client";
import { COUNTRIES_GEOJSON_URL } from "@/features/visitor-globe/globe-data";
import type { GeoCoordinates } from "@/features/visitor-globe/geo";

const Globe = dynamic(
  () => import("@/features/visitor-globe/globe").then((m) => m.Globe),
  {
    ssr: false,
    loading: () => null,
  },
);

function GlobePlaceholder({ hidden }: { hidden: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center ${hidden ? "opacity-0" : "opacity-100"}`}
      role={hidden ? undefined : "status"}
      aria-hidden={hidden || undefined}
    >
      <div className="size-[min(66vmin,38rem)] rounded-full bg-black/[0.035] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)] motion-safe:animate-pulse dark:bg-white/[0.035] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" />
      <span className="sr-only">Loading globe</span>
    </div>
  );
}

type GeoFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

type GeoJSON = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

export function VisitorGlobe({
  messages,
  viewerLocation,
}: {
  messages: VisitorMessage[];
  viewerLocation: GeoCoordinates;
}) {
  const [geojson, setGeojson] = useState<GeoJSON | null | undefined>(undefined);
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    // Start both large resources together instead of waiting for the map before
    // requesting the WebGL bundle.
    void import("@/features/visitor-globe/globe");
    fetch(COUNTRIES_GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load country borders.");
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
          />
        ) : null}
      </div>
      <GlobePlaceholder hidden={globeReady} />

      <Link
        href="/guestbook/new"
        className={`${actionClassName} absolute right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] py-2.5`}
      >
        Leave a message
      </Link>
    </div>
  );
}
