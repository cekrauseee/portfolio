"use client";

import { useCallback, useMemo, useRef } from "react";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GeoCoordinates } from "@/features/guestbook/message";
import {
  createCountryBordersGeometry,
  type GeoJSON,
  GLOBE_RADIUS,
  latLonToVector3,
  MARKER_RADIUS,
  type GlobePoint,
} from "@/features/guestbook/globe/geometry";

const POINT_HIT_RADIUS = 0.06;
const POINT_HIT_GEOMETRY = new THREE.SphereGeometry(POINT_HIT_RADIUS, 8, 8);
const POINT_MARKER_GEOMETRY = new THREE.CircleGeometry(0.009, 16);
const POINT_HIT_MATERIAL = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const POINT_MARKER_LIGHT_MATERIAL = new THREE.MeshBasicMaterial({
  color: "#1f1f1f",
  side: THREE.DoubleSide,
});
const POINT_MARKER_DARK_MATERIAL = new THREE.MeshBasicMaterial({
  color: "#ffffff",
  side: THREE.DoubleSide,
});
const LOCATION_MARKER_LIGHT = "#2563eb";
const LOCATION_MARKER_DARK = "#60a5fa";
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

function useCountryBorders(radius: number, geojson?: GeoJSON) {
  return useMemo(
    () => createCountryBordersGeometry(radius, geojson),
    [radius, geojson],
  );
}

export function GlobeSphere({
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
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <meshBasicMaterial
        color={isDark ? "#0d0d0d" : "#f3f3f3"}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

export function CountryBorders({
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
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={isDark ? "#666666" : "#9a9a9a"}
        transparent
        opacity={0.8}
      />
    </lineSegments>
  );
}

export function MessagePoints({
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
    <group dispose={null}>
      {points.map((point) => {
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          point.position.clone().normalize(),
        );

        return (
          <group
            key={point.id}
            position={point.position.toArray()}
            quaternion={quaternion}
          >
            <mesh
              geometry={POINT_HIT_GEOMETRY}
              material={POINT_HIT_MATERIAL}
              userData={{ pointId: point.id }}
              onPointerOver={handlePointerOver(point)}
              onPointerOut={handlePointerOut}
              onClick={handleClick(point)}
            />
            <mesh
              geometry={POINT_MARKER_GEOMETRY}
              material={
                isDark
                  ? POINT_MARKER_DARK_MATERIAL
                  : POINT_MARKER_LIGHT_MATERIAL
              }
              position={[0, 0, 0.001]}
              raycast={() => null}
            />
          </group>
        );
      })}
    </group>
  );
}

export function ViewerLocationMarker({
  location,
  isDark,
  reduceMotion,
}: {
  location: GeoCoordinates;
  isDark: boolean;
  reduceMotion: boolean;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { position, quaternion } = useMemo(() => {
    const markerPosition = latLonToVector3(
      location.latitude,
      location.longitude,
      MARKER_RADIUS + 0.002,
    );
    const markerQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      markerPosition.clone().normalize(),
    );

    return { position: markerPosition, quaternion: markerQuaternion };
  }, [location.latitude, location.longitude]);
  const color = isDark ? LOCATION_MARKER_DARK : LOCATION_MARKER_LIGHT;

  useFrame(({ clock }) => {
    const pulse = pulseRef.current;
    const material = pulseMaterialRef.current;
    if (!pulse || !material) {
      return;
    }
    if (reduceMotion) {
      pulse.scale.setScalar(1);
      material.opacity = 0.3;
      return;
    }
    const progress = (clock.elapsedTime % 2.4) / 2.4;
    pulse.scale.setScalar(1 + progress * 1.8);
    material.opacity = Math.pow(1 - progress, 2) * 0.42;
  });

  return (
    <group position={position.toArray()} quaternion={quaternion}>
      <mesh ref={pulseRef} position={[0, 0, 0.001]} raycast={() => null}>
        <ringGeometry args={[0.011, 0.014, 32]} />
        <meshBasicMaterial
          ref={pulseMaterialRef}
          color={color}
          transparent
          opacity={0.42}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.002]} raycast={() => null}>
        <circleGeometry args={[0.007, 20]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function AtmosphereGlow({ isDark }: { isDark: boolean }) {
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

export function FirstFrame({ onReady }: { onReady: () => void }) {
  const reported = useRef(false);
  useFrame(() => {
    if (reported.current) {
      return;
    }
    reported.current = true;
    window.setTimeout(onReady, 0);
  });
  return null;
}
