"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { SoundName } from "cuelume";
import { playInteractionSound } from "@/lib/interaction-sounds";

const keyboardPresses = new Map<string, Element>();

function soundFromAttribute(
  element: Element,
  attribute: "data-cuelume-press" | "data-cuelume-release",
  fallback: SoundName,
) {
  return (element.getAttribute(attribute) || fallback) as SoundName;
}

function activationKey(element: Element, key: string) {
  if (key === "Enter") {
    return element.matches("a[href], button");
  }

  return key === " " && element.matches("button");
}

export function InteractionSounds() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    void import("cuelume").then(({ bind }) => bind()).catch(() => undefined);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !(event.target instanceof Element)) {
        return;
      }

      const element = event.target.closest("[data-cuelume-press]");
      if (!element || !activationKey(element, event.key)) {
        return;
      }

      keyboardPresses.set(event.key, element);
      playInteractionSound(
        soundFromAttribute(element, "data-cuelume-press", "press"),
      );
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const element = keyboardPresses.get(event.key);
      if (!element) {
        return;
      }

      keyboardPresses.delete(event.key);
      if (element.hasAttribute("data-cuelume-release")) {
        playInteractionSound(
          soundFromAttribute(element, "data-cuelume-release", "release"),
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      keyboardPresses.clear();
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    playInteractionSound("arrival");
  }, [pathname]);

  return null;
}
