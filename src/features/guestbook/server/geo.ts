import type { GeoCoordinates } from "@/features/guestbook/message";

export type { GeoCoordinates };

type GeoHeaders = Pick<Headers, "get">;

/**
 * Resolve visitor coordinates from Vercel's trusted IP geolocation headers.
 *
 * Vercel injects `x-vercel-ip-latitude`, `x-vercel-ip-longitude`,
 * `x-vercel-ip-country`, `x-vercel-ip-country-region`, and `x-vercel-ip-city`
 * on every request. When coordinates are unavailable, the result is null.
 *
 * The IP address itself is never stored. Only the derived coordinates and
 * region labels are persisted.
 */
export function resolveGeo(request: Request): GeoCoordinates | null {
  return resolveGeoFromHeaders(request.headers);
}

export function resolveGeoFromHeaders(
  headers: GeoHeaders,
): GeoCoordinates | null {
  const latitude = headers.get("x-vercel-ip-latitude")?.trim();
  const longitude = headers.get("x-vercel-ip-longitude")?.trim();

  if (latitude && longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    ) {
      return {
        latitude: lat,
        longitude: lon,
        country: header(headers, "x-vercel-ip-country"),
        city: header(headers, "x-vercel-ip-city"),
      };
    }
  }

  return null;
}

function header(headers: GeoHeaders, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value || null;
}
