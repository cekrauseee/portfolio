"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { mutedButtonClassName } from "@/components/links";
import type { VisitorMessage } from "@/features/visitor-globe/db/client";

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

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);
    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

type GlobePoint = {
  id: string;
  messages: GlobeMessage[];
  position: THREE.Vector3;
  lat: number;
  lon: number;
};

type GlobeMessage = Pick<
  VisitorMessage,
  "id" | "name" | "message" | "city" | "country"
>;

const CLUSTER_THRESHOLD = 0.08;

function clusterPoints(points: GlobePoint[], radius: number): GlobePoint[] {
  if (points.length === 0) {
    return points;
  }

  const clusters: GlobePoint[][] = [];
  const assigned = new Set<string>();

  for (const point of points) {
    if (assigned.has(point.id)) {
      continue;
    }
    const cluster = [point];
    assigned.add(point.id);
    for (const other of points) {
      if (assigned.has(other.id)) {
        continue;
      }
      if (point.position.distanceTo(other.position) < CLUSTER_THRESHOLD) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }
    clusters.push(cluster);
  }

  return clusters.map((cluster) => {
    if (cluster.length === 1) {
      return cluster[0];
    }
    const centroid = new THREE.Vector3();
    let lat = 0;
    let lon = 0;
    for (const p of cluster) {
      centroid.add(p.position);
      lat += p.lat;
      lon += p.lon;
    }
    centroid.divideScalar(cluster.length);
    return {
      id: cluster.map((c) => c.id).join(","),
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

function useCountryBorders(radius: number, geojson?: GeoJSON) {
  const geometry = useMemo(() => {
    if (!geojson) {
      return new THREE.BufferGeometry();
    }

    const positions: number[] = [];
    for (const feature of geojson.features) {
      const rings = extractRings(feature.geometry);
      for (const ring of rings) {
        for (let i = 0; i < ring.length - 1; i++) {
          const [lon1, lat1] = ring[i];
          const [lon2, lat2] = ring[i + 1];
          const v1 = latLonToVector3(lat1, lon1, radius);
          const v2 = latLonToVector3(lat2, lon2, radius);
          positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        }
      }
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    return buffer;
  }, [radius, geojson]);

  return geometry;
}

const GLOBE_RADIUS = 1;
const POINT_RADIUS = GLOBE_RADIUS + 0.028;
const POINT_HIT_RADIUS = 0.06;
const WHEEL_ROTATION_SPEED = 0.004;
const MAX_WHEEL_DELTA = 80;
const MIN_POLAR_ANGLE = 0.15;
const MAX_POLAR_ANGLE = Math.PI - MIN_POLAR_ANGLE;
const INTERACTION_IDLE_DELAY = 1200;
const HOVER_EXIT_DELAY = 140;
const GLOBE_OCCLUSION_SPHERE = new THREE.Sphere(
  new THREE.Vector3(),
  GLOBE_RADIUS,
);
const GLOBE_OCCLUSION_POINT = new THREE.Vector3();

function isOccludedByGlobe(
  event: Pick<ThreeEvent<PointerEvent>, "distance" | "ray">,
) {
  const intersection = event.ray.intersectSphere(
    GLOBE_OCCLUSION_SPHERE,
    GLOBE_OCCLUSION_POINT,
  );

  return (
    intersection !== null &&
    event.ray.origin.distanceTo(intersection) < event.distance
  );
}

function GlobeSphere({
  isDark,
  onPointerOver,
  onPointerOut,
}: {
  isDark: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  return (
    <mesh onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color={isDark ? "#0d0d0d" : "#f3f3f3"}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

function CountryBorders({
  geojson,
  isDark,
}: {
  geojson?: GeoJSON;
  isDark: boolean;
}) {
  const geometry = useCountryBorders(GLOBE_RADIUS, geojson);

  if (geometry.attributes.position.count === 0) {
    return null;
  }

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          color={isDark ? "#666666" : "#9a9a9a"}
          transparent
          opacity={0.8}
        />
      </lineSegments>
    </group>
  );
}

function MessagePoints({
  points,
  isDark,
  onHover,
  onSelect,
}: {
  points: GlobePoint[];
  isDark: boolean;
  onHover: (point: GlobePoint | null) => void;
  onSelect: (point: GlobePoint) => void;
}) {
  const handlePointerOver = useCallback(
    (point: GlobePoint) => (event: ThreeEvent<PointerEvent>) => {
      if (isOccludedByGlobe(event)) {
        return;
      }
      event.stopPropagation();
      onHover(point);
    },
    [onHover],
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHover(null);
    },
    [onHover],
  );

  const handleClick = useCallback(
    (point: GlobePoint) => (event: ThreeEvent<MouseEvent>) => {
      if (isOccludedByGlobe(event)) {
        return;
      }
      event.stopPropagation();
      onSelect(point);
    },
    [onSelect],
  );

  if (points.length === 0) {
    return null;
  }

  return (
    <group>
      {points.map((point) => (
        <group key={point.id} position={point.position.toArray()}>
          {/* Invisible larger hit area for easier interaction */}
          <mesh
            userData={{ pointId: point.id }}
            onPointerOver={handlePointerOver(point)}
            onPointerOut={handlePointerOut}
            onClick={handleClick(point)}
          >
            <sphereGeometry args={[POINT_HIT_RADIUS, 10, 10]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh raycast={() => null}>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshBasicMaterial color={isDark ? "#ffffff" : "#1f1f1f"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AtmosphereGlow({ isDark }: { isDark: boolean }) {
  return (
    <mesh scale={GLOBE_RADIUS * 1.08}>
      <sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
      <meshBasicMaterial
        color={isDark ? "#ffffff" : "#000000"}
        transparent
        opacity={0.04}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

export type { GlobePoint };

export function Globe({
  messages,
  geojson,
}: {
  messages: VisitorMessage[];
  geojson?: GeoJSON;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<GlobePoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<GlobePoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerOverGlobe, setIsPointerOverGlobe] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const interactionTimerRef = useRef<number | undefined>(undefined);
  const hoverExitTimerRef = useRef<number | undefined>(undefined);
  const isDark = useMediaQuery("(prefers-color-scheme: dark)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const points = useMemo(() => {
    const mapped: GlobePoint[] = messages.map((msg) => {
      const position = latLonToVector3(
        msg.latitude,
        msg.longitude,
        POINT_RADIUS,
      );
      return {
        id: msg.id,
        messages: [msg],
        position,
        lat: msg.latitude,
        lon: msg.longitude,
      };
    });
    return clusterPoints(mapped, POINT_RADIUS);
  }, [messages]);

  const allMessages = useMemo<GlobePoint>(
    () => ({
      id: "all-messages",
      messages: [...messages].reverse(),
      position: new THREE.Vector3(),
      lat: 0,
      lon: 0,
    }),
    [messages],
  );

  const markUserInteraction = useCallback(() => {
    setIsUserInteracting(true);
    if (interactionTimerRef.current !== undefined) {
      window.clearTimeout(interactionTimerRef.current);
    }
    interactionTimerRef.current = window.setTimeout(() => {
      setIsUserInteracting(false);
      interactionTimerRef.current = undefined;
    }, INTERACTION_IDLE_DELAY);
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!isPointerOverGlobe && !hoveredPoint) {
        return;
      }

      event.preventDefault();
      const controls = controlsRef.current;
      if (!controls) {
        return;
      }

      markUserInteraction();

      const deltaMultiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      const horizontalDelta = THREE.MathUtils.clamp(
        event.deltaX * deltaMultiplier,
        -MAX_WHEEL_DELTA,
        MAX_WHEEL_DELTA,
      );
      const verticalDelta = THREE.MathUtils.clamp(
        event.deltaY * deltaMultiplier,
        -MAX_WHEEL_DELTA,
        MAX_WHEEL_DELTA,
      );

      const nextAzimuthalAngle =
        controls.getAzimuthalAngle() + horizontalDelta * WHEEL_ROTATION_SPEED;
      const nextPolarAngle = THREE.MathUtils.clamp(
        controls.getPolarAngle() + verticalDelta * WHEEL_ROTATION_SPEED,
        MIN_POLAR_ANGLE,
        MAX_POLAR_ANGLE,
      );

      const dampingEnabled = controls.enableDamping;
      controls.enableDamping = false;
      controls.setAzimuthalAngle(nextAzimuthalAngle);
      controls.setPolarAngle(nextPolarAngle);
      controls.enableDamping = dampingEnabled;
    },
    [hoveredPoint, isPointerOverGlobe, markUserInteraction],
  );

  const handlePointHover = useCallback((point: GlobePoint | null) => {
    if (hoverExitTimerRef.current !== undefined) {
      window.clearTimeout(hoverExitTimerRef.current);
      hoverExitTimerRef.current = undefined;
    }

    if (point) {
      setHoveredPoint(point);
      return;
    }

    hoverExitTimerRef.current = window.setTimeout(() => {
      setHoveredPoint(null);
      hoverExitTimerRef.current = undefined;
    }, HOVER_EXIT_DELAY);
  }, []);

  const isExploringPoint = hoveredPoint !== null || selectedPoint !== null;

  useEffect(() => {
    if (!selectedPoint) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPoint(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPoint]);

  useEffect(() => {
    return () => {
      if (interactionTimerRef.current !== undefined) {
        window.clearTimeout(interactionTimerRef.current);
      }
      if (hoverExitTimerRef.current !== undefined) {
        window.clearTimeout(hoverExitTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute top-1/2 left-1/2 size-[min(100vmin,60rem)] -translate-x-1/2 -translate-y-1/2"
        style={{
          cursor: isDragging
            ? "grabbing"
            : hoveredPoint
              ? "pointer"
              : isPointerOverGlobe
                ? "grab"
                : "auto",
        }}
        onPointerDown={() => {
          if (isPointerOverGlobe || hoveredPoint) {
            setIsDragging(true);
          }
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
        onWheel={handleWheel}
      >
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1} />
          <group>
            <GlobeSphere
              isDark={isDark}
              onPointerOver={() => setIsPointerOverGlobe(true)}
              onPointerOut={() => setIsPointerOverGlobe(false)}
            />
            <CountryBorders geojson={geojson} isDark={isDark} />
            <AtmosphereGlow isDark={isDark} />
            <MessagePoints
              points={points}
              isDark={isDark}
              onHover={handlePointHover}
              onSelect={setSelectedPoint}
            />
            {hoveredPoint ? <HoverTooltip point={hoveredPoint} /> : null}
          </group>
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={false}
            enableRotate={
              isPointerOverGlobe || isDragging || hoveredPoint !== null
            }
            enableDamping
            dampingFactor={0.08}
            autoRotate={
              !reduceMotion && !isExploringPoint && !isUserInteracting
            }
            autoRotateSpeed={0.3}
            rotateSpeed={0.5}
            minPolarAngle={MIN_POLAR_ANGLE}
            maxPolarAngle={MAX_POLAR_ANGLE}
            onStart={markUserInteraction}
            onEnd={markUserInteraction}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.ROTATE,
            }}
          />
        </Canvas>
      </div>

      {messages.length > 0 ? (
        <button
          type="button"
          className={`${mutedButtonClassName} absolute top-[calc(1rem+env(safe-area-inset-top))] right-[calc(1rem+env(safe-area-inset-right))] z-10 text-sm`}
          onClick={() => setSelectedPoint(allMessages)}
        >
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </button>
      ) : null}

      {selectedPoint ? (
        <MessagePanel
          point={selectedPoint}
          onClose={() => setSelectedPoint(null)}
        />
      ) : null}

      {/* Empty state */}
      {messages.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-black/50 dark:text-white/50">
            No messages yet. Be the first.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function HoverTooltip({ point }: { point: GlobePoint }) {
  const firstMessage = point.messages[0];
  const location = [firstMessage.city, firstMessage.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Html
      position={point.position.toArray()}
      center
      pointerEvents="none"
      style={{ pointerEvents: "none" }}
      zIndexRange={[9, 1]}
    >
      <div className="pointer-events-none w-max max-w-56 -translate-y-8 bg-white/95 px-3 py-2 text-center text-sm leading-5 break-words text-black shadow-md select-none dark:bg-black/90 dark:text-white">
        <p className="font-medium text-pretty">
          {point.messages.length === 1
            ? firstMessage.name
            : `${point.messages.length} messages`}
        </p>
        {location ? (
          <p className="mt-0.5 text-xs leading-4 text-pretty text-black/60 dark:text-white/65">
            {location}
          </p>
        ) : null}
      </div>
    </Html>
  );
}

function MessagePanel({
  point,
  onClose,
}: {
  point: GlobePoint;
  onClose: () => void;
}) {
  return (
    <aside
      aria-label="Visitor messages"
      className="absolute inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex max-h-[min(60dvh,28rem)] flex-col bg-white/95 p-4 text-black shadow-xl sm:inset-x-auto sm:top-[calc(3.75rem+env(safe-area-inset-top))] sm:right-[calc(1rem+env(safe-area-inset-right))] sm:bottom-auto sm:w-80 dark:bg-black/90 dark:text-white"
      onWheel={(event) => event.stopPropagation()}
    >
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">
            {point.id === "all-messages"
              ? "Visitor messages"
              : point.messages.length === 1
                ? "Message"
                : `${point.messages.length} messages nearby`}
          </h2>
          {point.id !== "all-messages" ? (
            <p className="mt-1 text-xs text-black/55 dark:text-white/55">
              {[point.messages[0].city, point.messages[0].country]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}
        </div>
        <button
          autoFocus
          type="button"
          className={`${mutedButtonClassName} shrink-0 text-sm`}
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div className="mt-5 min-h-0 overflow-y-auto overscroll-contain pr-2">
        <div className="flex flex-col gap-6">
          {point.messages.map((message) => {
            const location = [message.city, message.country]
              .filter(Boolean)
              .join(", ");

            return (
              <article key={message.id}>
                <header>
                  <h3 className="text-sm font-medium">{message.name}</h3>
                  {location && point.id === "all-messages" ? (
                    <p className="mt-0.5 text-xs text-black/55 dark:text-white/55">
                      {location}
                    </p>
                  ) : null}
                </header>
                <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap text-black/75 dark:text-white/85">
                  {message.message}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default Globe;
