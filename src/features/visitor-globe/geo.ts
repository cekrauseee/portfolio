type GeoEnvironment = Record<string, string | undefined>;

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
};

type GeoHeaders = Pick<Headers, "get">;

/**
 * Resolve visitor coordinates from Vercel's trusted IP geolocation headers.
 *
 * Vercel injects `x-vercel-ip-latitude`, `x-vercel-ip-longitude`,
 * `x-vercel-ip-country`, `x-vercel-ip-country-region`, and `x-vercel-ip-city`
 * on every request. In development these headers are absent, so we fall back
 * to a default coordinate (Lisbon) to keep the local experience functional.
 *
 * The IP address itself is never stored. Only the derived coordinates and
 * region labels are persisted.
 */
export function resolveGeo(
  request: Request,
  environment: GeoEnvironment = process.env,
): GeoCoordinates {
  return resolveGeoFromHeaders(request.headers, environment);
}

export function resolveGeoFromHeaders(
  headers: GeoHeaders,
  environment: GeoEnvironment = process.env,
): GeoCoordinates {
  const latitude = headers.get("x-vercel-ip-latitude");
  const longitude = headers.get("x-vercel-ip-longitude");

  if (latitude && longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        latitude: lat,
        longitude: lon,
        country: header(headers, "x-vercel-ip-country"),
        city: header(headers, "x-vercel-ip-city"),
      };
    }
  }

  // Development fallback: Lisbon. Avoids requiring geo headers locally.
  return {
    latitude: 38.7223,
    longitude: -9.1393,
    country: environment.NODE_ENV === "production" ? null : "Portugal",
    city: environment.NODE_ENV === "production" ? null : "Lisbon",
  };
}

function header(headers: GeoHeaders, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value || null;
}
