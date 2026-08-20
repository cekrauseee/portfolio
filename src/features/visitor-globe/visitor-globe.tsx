"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { actionClassName } from "@/components/links";
import type { VisitorMessage } from "@/features/visitor-globe/db/client";

const Globe = dynamic(
  () => import("@/features/visitor-globe/globe").then((m) => m.Globe),
  {
    ssr: false,
    loading: () => <GlobePlaceholder />,
  },
);

function GlobePlaceholder() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      aria-label="Loading globe"
    >
      <div className="size-2 animate-pulse bg-black/30 motion-reduce:animate-none dark:bg-white/30" />
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

export function VisitorGlobe({ messages }: { messages: VisitorMessage[] }) {
  const [geojson, setGeojson] = useState<GeoJSON | null>(null);

  useEffect(() => {
    fetch("/countries.geojson")
      .then((res) => res.json() as Promise<GeoJSON>)
      .then(setGeojson)
      .catch(() => setGeojson(null));
  }, []);

  return (
    <div className="relative h-full w-full">
      {geojson ? (
        <Globe messages={messages} geojson={geojson} />
      ) : (
        <GlobePlaceholder />
      )}

      <Link
        href="/guestbook/new"
        className={`${actionClassName} absolute right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] py-2.5`}
      >
        Leave a message
      </Link>
    </div>
  );
}
