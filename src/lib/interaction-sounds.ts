import type { SoundName } from "cuelume";

export function playInteractionSound(name: SoundName) {
  if (typeof window === "undefined") {
    return;
  }

  void import("cuelume").then(({ play }) => play(name)).catch(() => undefined);
}
