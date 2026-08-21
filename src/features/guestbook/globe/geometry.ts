import * as THREE from "three";
import type { GuestbookMessage } from "@/features/guestbook/message";

export type GeoFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

export type GeoJSON = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

export type GlobeMessage = Pick<
  GuestbookMessage,
  "id" | "name" | "message" | "city" | "country"
>;

export type GlobePoint = {
  id: string;
  messages: GlobeMessage[];
  position: THREE.Vector3;
  lat: number;
  lon: number;
};

export const GLOBE_RADIUS = 1;
export const MARKER_RADIUS = GLOBE_RADIUS + 0.004;
export const CLUSTER_THRESHOLD = 0.08;

export function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function clusterPoints(
  points: GlobePoint[],
  radius: number,
): GlobePoint[] {
  if (points.length === 0) {
    return points;
  }

  const cellKey = (position: THREE.Vector3) =>
    `${Math.floor(position.x / CLUSTER_THRESHOLD)},${Math.floor(position.y / CLUSTER_THRESHOLD)},${Math.floor(position.z / CLUSTER_THRESHOLD)}`;
  const grid = new Map<string, number[]>();

  points.forEach((point, index) => {
    const key = cellKey(point.position);
    const cell = grid.get(key);
    if (cell) {
      cell.push(index);
    } else {
      grid.set(key, [index]);
    }
  });

  const clusters: GlobePoint[][] = [];
  const assigned = new Set<number>();

  points.forEach((point, pointIndex) => {
    if (assigned.has(pointIndex)) {
      return;
    }

    const originX = Math.floor(point.position.x / CLUSTER_THRESHOLD);
    const originY = Math.floor(point.position.y / CLUSTER_THRESHOLD);
    const originZ = Math.floor(point.position.z / CLUSTER_THRESHOLD);
    const nearbyIndexes: number[] = [];

    for (let x = originX - 1; x <= originX + 1; x++) {
      for (let y = originY - 1; y <= originY + 1; y++) {
        for (let z = originZ - 1; z <= originZ + 1; z++) {
          nearbyIndexes.push(...(grid.get(`${x},${y},${z}`) ?? []));
        }
      }
    }

    const cluster = nearbyIndexes
      .filter(
        (otherIndex) =>
          !assigned.has(otherIndex) &&
          point.position.distanceTo(points[otherIndex].position) <
            CLUSTER_THRESHOLD,
      )
      .sort((a, b) => a - b)
      .map((index) => {
        assigned.add(index);
        return points[index];
      });

    clusters.push(cluster);
  });

  return clusters.map((cluster) => {
    if (cluster.length === 1) {
      return cluster[0];
    }
    const centroid = new THREE.Vector3();
    let lat = 0;
    let lon = 0;
    for (const point of cluster) {
      centroid.add(point.position);
      lat += point.lat;
      lon += point.lon;
    }
    centroid.divideScalar(cluster.length);
    return {
      id: cluster.map((point) => point.id).join(","),
      messages: cluster.flatMap((point) => point.messages),
      position: centroid.normalize().multiplyScalar(radius),
      lat: lat / cluster.length,
      lon: lon / cluster.length,
    };
  });
}

function extractRings(geometry: GeoFeature["geometry"]): number[][][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates as number[][][];
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).flat();
  }
  return [];
}

export function createCountryBordersGeometry(
  radius: number,
  geojson?: GeoJSON,
) {
  if (!geojson) {
    return new THREE.BufferGeometry();
  }

  const positions: number[] = [];
  for (const feature of geojson.features) {
    const rings = extractRings(feature.geometry);
    for (const ring of rings) {
      for (let index = 0; index < ring.length - 1; index++) {
        const [lon1, lat1] = ring[index];
        const [lon2, lat2] = ring[index + 1];
        const first = latLonToVector3(lat1, lon1, radius);
        const second = latLonToVector3(lat2, lon2, radius);
        positions.push(first.x, first.y, first.z, second.x, second.y, second.z);
      }
    }
  }

  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return buffer;
}

export function viewAnglesForLocation(location: {
  latitude: number;
  longitude: number;
}) {
  const direction = latLonToVector3(location.latitude, location.longitude, 1);
  const spherical = new THREE.Spherical().setFromVector3(direction);

  return { azimuthal: spherical.theta, polar: spherical.phi };
}

export function shortestAngleDelta(from: number, to: number) {
  return (
    THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI
  );
}

export function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}
