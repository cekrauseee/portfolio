"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { playInteractionSound } from "@/lib/interaction-sounds";

export function InteractionSounds() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    void import("cuelume").then(({ bind }) => bind()).catch(() => undefined);
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
