"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { mutedButtonClassName } from "@/components/links";
import { localeTag, type Locale } from "@/i18n/config";
import { useTheme } from "@/theme/theme-provider";
import type { Dictionary } from "@/i18n/dictionary";
import type {
  GeoCoordinates,
  GuestbookMessage,
} from "@/features/guestbook/message";
import {
  clusterPoints,
  easeInOutCubic,
  type GeoJSON,
  latLonToVector3,
  MARKER_RADIUS,
  type GlobePoint,
  shortestAngleDelta,
  viewAnglesForLocation,
} from "@/features/guestbook/globe/geometry";
import {
  HoverTooltip,
  MessagePanel,
} from "@/features/guestbook/globe/message-panel";
import {
  AtmosphereGlow,
  CountryBorders,
  FirstFrame,
  GlobeSphere,
  MessagePoints,
  ViewerLocationMarker,
} from "@/features/guestbook/globe/scene";

const WHEEL_ROTATION_SPEED = 0.004;
const MAX_WHEEL_DELTA = 80;
const MIN_POLAR_ANGLE = 0.15;
const MAX_POLAR_ANGLE = Math.PI - MIN_POLAR_ANGLE;
const INTERACTION_IDLE_DELAY = 1200;
const HOVER_EXIT_DELAY = 140;
const CENTER_ANIMATION_DURATION = 900;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener("change", updateMatch);
    return () => mediaQuery.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

export function Globe({
  messages,
  geojson,
  viewerLocation,
  onReady,
  locale,
  dictionary,
  primaryAction,
}: {
  messages: GuestbookMessage[];
  geojson?: GeoJSON;
  viewerLocation: GeoCoordinates;
  onReady: () => void;
  locale: Locale;
  dictionary: Dictionary["guestbook"]["globe"];
  primaryAction: ReactNode;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<GlobePoint | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<GlobePoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerOverGlobe, setIsPointerOverGlobe] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [isCentering, setIsCentering] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const centerAnimationRef = useRef<number | undefined>(undefined);
  const interactionTimerRef = useRef<number | undefined>(undefined);
  const hoverExitTimerRef = useRef<number | undefined>(undefined);
  const { isDark } = useTheme();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const initialCameraPosition = useMemo(
    () =>
      latLonToVector3(
        viewerLocation.latitude,
        viewerLocation.longitude,
        3,
      ).toArray() as [number, number, number],
    [viewerLocation.latitude, viewerLocation.longitude],
  );

  const points = useMemo(() => {
    const mapped: GlobePoint[] = messages.map((message) => ({
      id: message.id,
      messages: [message],
      position: latLonToVector3(
        message.latitude,
        message.longitude,
        MARKER_RADIUS,
      ),
      lat: message.latitude,
      lon: message.longitude,
    }));
    return clusterPoints(mapped, MARKER_RADIUS);
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

  const cancelCentering = useCallback(() => {
    if (centerAnimationRef.current !== undefined) {
      window.cancelAnimationFrame(centerAnimationRef.current);
      centerAnimationRef.current = undefined;
    }
    if (controlsRef.current) {
      controlsRef.current.enableDamping = true;
    }
    setIsCentering(false);
  }, []);

  const markUserInteraction = useCallback(() => {
    cancelCentering();
    setIsUserInteracting(true);
    if (interactionTimerRef.current !== undefined) {
      window.clearTimeout(interactionTimerRef.current);
    }
    interactionTimerRef.current = window.setTimeout(() => {
      setIsUserInteracting(false);
      interactionTimerRef.current = undefined;
    }, INTERACTION_IDLE_DELAY);
  }, [cancelCentering]);

  const centerOnViewer = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    cancelCentering();
    setSelectedPoint(null);
    setHoveredPoint(null);
    setIsCentering(true);
    setIsUserInteracting(true);
    if (interactionTimerRef.current !== undefined) {
      window.clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = undefined;
    }

    const target = viewAnglesForLocation(viewerLocation);
    const startPolar = controls.getPolarAngle();
    const startAzimuthal = controls.getAzimuthalAngle();
    const azimuthalDelta = shortestAngleDelta(startAzimuthal, target.azimuthal);

    const finish = () => {
      controls.setPolarAngle(target.polar);
      controls.setAzimuthalAngle(target.azimuthal);
      controls.enableDamping = true;
      centerAnimationRef.current = undefined;
      setIsCentering(false);
      interactionTimerRef.current = window.setTimeout(() => {
        setIsUserInteracting(false);
        interactionTimerRef.current = undefined;
      }, INTERACTION_IDLE_DELAY);
    };

    if (reduceMotion) {
      finish();
      return;
    }

    controls.enableDamping = false;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(
        (now - startedAt) / CENTER_ANIMATION_DURATION,
        1,
      );
      const easedProgress = easeInOutCubic(progress);
      controls.setPolarAngle(
        THREE.MathUtils.lerp(startPolar, target.polar, easedProgress),
      );
      controls.setAzimuthalAngle(
        startAzimuthal + azimuthalDelta * easedProgress,
      );

      if (progress < 1) {
        centerAnimationRef.current = window.requestAnimationFrame(animate);
      } else {
        finish();
      }
    };

    centerAnimationRef.current = window.requestAnimationFrame(animate);
  }, [cancelCentering, reduceMotion, viewerLocation]);

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
      if (centerAnimationRef.current !== undefined) {
        window.cancelAnimationFrame(centerAnimationRef.current);
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
          camera={{ position: initialCameraPosition, fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <FirstFrame onReady={onReady} />
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
            <ViewerLocationMarker
              location={viewerLocation}
              isDark={isDark}
              reduceMotion={reduceMotion}
            />
            {hoveredPoint ? (
              <Html
                position={hoveredPoint.position.toArray()}
                center
                pointerEvents="none"
                style={{ pointerEvents: "none" }}
                zIndexRange={[9, 1]}
              >
                <HoverTooltip
                  point={hoveredPoint}
                  dictionary={dictionary}
                  locale={locale}
                />
              </Html>
            ) : null}
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
              !reduceMotion &&
              !isCentering &&
              !isExploringPoint &&
              !isUserInteracting
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

      <div className="pointer-events-none absolute inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex justify-center">
        <div className="bg-background/85 pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 p-2 shadow-[0_8px_32px_rgb(0_0_0/0.14)] outline outline-black/10 backdrop-blur-md dark:shadow-[0_8px_32px_rgb(0_0_0/0.5)] dark:outline-white/15">
          <button
            type="button"
            className={`${mutedButtonClassName} inline-flex min-h-10 items-center gap-2 px-2 text-sm motion-safe:transition-transform motion-safe:active:scale-[0.96]`}
            onClick={centerOnViewer}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {isCentering ? dictionary.centering : dictionary.myLocation}
          </button>
          {primaryAction}
        </div>
      </div>

      {messages.length > 0 ? (
        <button
          type="button"
          className={`${mutedButtonClassName} absolute top-[calc(1rem+env(safe-area-inset-top))] left-1/2 z-20 inline-flex min-h-8 -translate-x-1/2 items-center text-sm`}
          onClick={() => setSelectedPoint(allMessages)}
        >
          {(messages.length === 1
            ? dictionary.messageCountOne
            : dictionary.messageCountMany
          ).replace(
            "{count}",
            messages.length.toLocaleString(localeTag(locale)),
          )}
        </button>
      ) : null}

      {selectedPoint ? (
        <MessagePanel
          point={selectedPoint}
          dictionary={dictionary}
          locale={locale}
          onClose={() => setSelectedPoint(null)}
        />
      ) : null}

      {messages.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-black/50 dark:text-white/50">
            {dictionary.empty}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default Globe;
