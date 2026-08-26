import {
  validateSubmittedGeoCoordinates,
  type SubmittedGeoCoordinates,
} from "@/features/guestbook/message";

export const DEVICE_LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
};

export type DeviceLocationMode = "granted-only" | "request";
export type DeviceLocationResult =
  | { status: "available"; location: SubmittedGeoCoordinates }
  | { status: "denied" | "not-granted" | "unavailable" };

type DeviceLocationDependencies = {
  permissions?: Pick<Permissions, "query">;
  geolocation?: Pick<Geolocation, "getCurrentPosition">;
};

/**
 * Resolve browser geolocation through one consent-aware API.
 * `granted-only` never opens a permission prompt; `request` is for a direct
 * user action and may ask for permission.
 */
export async function resolveDeviceLocation(
  mode: DeviceLocationMode,
  dependencies: DeviceLocationDependencies = browserDependencies(),
): Promise<DeviceLocationResult> {
  const { permissions, geolocation } = dependencies;
  if (!geolocation?.getCurrentPosition) {
    return { status: "unavailable" };
  }

  if (mode === "granted-only") {
    if (!permissions?.query) {
      return { status: "unavailable" };
    }
    try {
      const permission = await permissions.query({ name: "geolocation" });
      if (permission.state !== "granted") {
        return { status: "not-granted" };
      }
    } catch {
      return { status: "unavailable" };
    }
  }

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        const location = validateSubmittedGeoCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        resolve(
          location
            ? { status: "available", location }
            : { status: "unavailable" },
        );
      },
      (error) =>
        resolve({ status: error.code === 1 ? "denied" : "unavailable" }),
      DEVICE_LOCATION_OPTIONS,
    );
  });
}

function browserDependencies(): DeviceLocationDependencies {
  if (typeof navigator === "undefined") {
    return {};
  }
  return {
    permissions: navigator.permissions,
    geolocation: navigator.geolocation,
  };
}
