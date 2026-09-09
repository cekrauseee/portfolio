const colorProperties = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "fill",
  "stroke",
] as const;

const transitionProperties = [
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "transition-delay",
  "transition-behavior",
] as const;

const instantColors = colorProperties
  .map(
    (property) =>
      `${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} 0s`,
  )
  .join(", ");

const activeAnimations = new Set<Animation>();

function cancelThemeAnimations() {
  for (const animation of activeAnimations) {
    animation.cancel();
  }
  activeAnimations.clear();
}

function readColors(element: Element) {
  const computed = getComputedStyle(element);
  return Object.fromEntries(
    colorProperties.map((property) => [property, computed[property]]),
  );
}

/** Commit both the theme and React controls synchronously inside update. */
export function transitionTheme(update: () => void) {
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof document.documentElement.animate !== "function"
  ) {
    cancelThemeAnimations();
    update();
    return;
  }

  // Capture the displayed colors before cancelling an interrupted animation.
  const snapshots = Array.from(document.querySelectorAll("html, body, body *"))
    .filter(
      (element): element is HTMLElement | SVGElement =>
        element instanceof HTMLElement || element instanceof SVGElement,
    )
    .map((element) => {
      const computed = getComputedStyle(element);
      return {
        element,
        before: readColors(element),
        transition:
          computed.transitionProperty === "none" ? "" : computed.transition,
        original: transitionProperties.map((property) => ({
          property,
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        })),
      };
    });

  cancelThemeAnimations();
  let targets: ReturnType<typeof readColors>[];
  try {
    for (const { element, transition } of snapshots) {
      // Prevent hover/label CSS transitions from contaminating the final palette.
      // Other motion keeps its existing timing and is never cancelled.
      element.style.transition = transition
        ? `${transition}, ${instantColors}`
        : instantColors;
    }
    update();
    // Read every final color before animating any ancestor: inherited colors
    // must have fixed endpoints, not follow a parent's changing computed value.
    targets = snapshots.map(({ element }) => readColors(element));
  } finally {
    for (const { element, original } of snapshots) {
      for (const { property, value, priority } of original) {
        if (value) {
          element.style.setProperty(property, value, priority);
        } else {
          element.style.removeProperty(property);
        }
      }
    }
  }

  const startTime = document.timeline.currentTime;
  snapshots.forEach(({ element, before }, index) => {
    if (!element.isConnected) {
      return;
    }
    const after = targets[index];
    if (
      colorProperties.every((property) => before[property] === after[property])
    ) {
      return;
    }
    const animation = element.animate([before, after], {
      duration: 250,
      easing: "ease-in-out",
    });
    if (startTime !== null) {
      animation.startTime = startTime;
    }
    activeAnimations.add(animation);
    animation.onfinish = animation.oncancel = () => {
      activeAnimations.delete(animation);
    };
  });
}
