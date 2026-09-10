"use client";

import { useLayoutEffect, useRef } from "react";
import { createButtonLabelMotion } from "@/lib/button-label-motion";

/** Keep the button mounted while its text and intrinsic width change. */
export function AnimatedButtonLabel({
  children,
  state,
}: {
  children: string;
  state: string | boolean;
}) {
  const container = useRef<HTMLSpanElement>(null);
  const current = useRef<HTMLSpanElement>(null);
  const motion = useRef<ReturnType<typeof createButtonLabelMotion> | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!container.current || !current.current) {
      return;
    }
    const controller = createButtonLabelMotion(
      container.current,
      current.current,
    );
    motion.current = controller;
    return () => {
      controller.dispose();
      motion.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    motion.current?.update(children, state);
  }, [children, state]);

  return (
    <span
      ref={container}
      className="relative inline-block max-w-full min-w-0 overflow-clip align-bottom"
    >
      <span ref={current} className="block w-max whitespace-nowrap">
        {children}
      </span>
    </span>
  );
}
