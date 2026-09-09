export function stabilizeViewportAnchor(
  anchor: HTMLElement,
  targetTop: number,
) {
  const main = anchor.closest<HTMLElement>("main");

  if (main) {
    const { overflowY } = window.getComputedStyle(main);
    const isScrollable = overflowY === "auto" || overflowY === "scroll";

    if (isScrollable) {
      const delta = anchor.getBoundingClientRect().top - targetTop;
      if (Math.abs(delta) <= 0.5) {
        return;
      }

      main.scrollBy({ top: delta, behavior: "instant" });
      return;
    }
  }

  const delta = anchor.getBoundingClientRect().top - targetTop;
  if (Math.abs(delta) <= 0.5) {
    return;
  }

  window.scrollBy({ top: delta, behavior: "instant" });
}

export function getViewportScroller(root: HTMLElement) {
  const main = root.closest<HTMLElement>("main");
  return main && /^(auto|scroll)$/.test(getComputedStyle(main).overflowY)
    ? main
    : (document.scrollingElement as HTMLElement);
}

/** Follow the panel's actual layout, including interrupted CSS transitions. */
export function followPanelHeight(
  root: HTMLElement,
  panel: HTMLElement,
  scroller: HTMLElement,
  target: number,
  finalHeight: number,
  trackRoot = false,
) {
  const start = scroller.scrollTop;
  if (!trackRoot && Math.abs(target - start) <= 0.5) {
    return () => {};
  }
  const initialRootTop = root.getBoundingClientRect().top + start;
  const initialHeight = panel.getBoundingClientRect().height;
  const viewport = window.visualViewport;
  const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 500;
  let frame = 0;
  let started: number | undefined;
  let expected = start;
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  function cancel() {
    cancelAnimationFrame(frame);
    for (const event of events) {
      window.removeEventListener(event, cancel, true);
    }
    window.removeEventListener("resize", cancel);
    viewport?.removeEventListener("resize", cancel);
  }
  function step(now: number) {
    // A shrinking page can clamp scrollTop before this frame runs. That is
    // browser layout, not user input; continue from the clamped position.
    const boundedExpected = Math.min(
      expected,
      Math.max(0, scroller.scrollHeight - scroller.clientHeight),
    );
    if (
      !root.isConnected ||
      Math.abs(scroller.scrollTop - boundedExpected) > 1
    ) {
      cancel();
      return;
    }
    started ??= now;
    const distance = finalHeight - initialHeight;
    const progress =
      !duration || now - started >= duration || Math.abs(distance) <= 0.5
        ? 1
        : Math.max(
            0,
            Math.min(
              1,
              (panel.getBoundingClientRect().height - initialHeight) / distance,
            ),
          );
    // A previously open sibling may be shrinking above this heading. Account
    // for that displacement in the same motion, rather than fighting an anchor.
    const rootShift = trackRoot
      ? root.getBoundingClientRect().top + scroller.scrollTop - initialRootTop
      : 0;
    scroller.scrollTo({
      top: start + (target - start) * progress + rootShift,
      behavior: "instant",
    });
    expected = scroller.scrollTop;
    if (progress < 1 || (trackRoot && now - started < duration)) {
      frame = requestAnimationFrame(step);
    } else {
      cancel();
    }
  }
  for (const event of events) {
    window.addEventListener(event, cancel, { capture: true, passive: true });
  }
  window.addEventListener("resize", cancel);
  viewport?.addEventListener("resize", cancel);
  frame = requestAnimationFrame(step);
  return cancel;
}

/** Release only scroll space that closing removes, without restoring old scroll. */
export function releaseCollapsedViewport(
  root: HTMLElement,
  panel: HTMLElement,
) {
  const scroller = getViewportScroller(root);
  const finalMaxScroll = Math.max(
    0,
    scroller.scrollHeight -
      panel.getBoundingClientRect().height -
      scroller.clientHeight,
  );
  return followPanelHeight(
    root,
    panel,
    scroller,
    Math.min(scroller.scrollTop, finalMaxScroll),
    0,
  );
}

/** Accommodate a disclosure once, keeping its heading with the visible content. */
export function accommodateExpandedContent(
  root: HTMLElement,
  panel: HTMLElement,
  switching = false,
) {
  const main = root.closest<HTMLElement>("main");
  const scroller = getViewportScroller(root);
  const viewport = window.visualViewport;
  const bounds = main?.getBoundingClientRect();
  const top = Math.max(viewport?.offsetTop ?? 0, bounds?.top ?? 0) + 24;
  const bottom =
    Math.min(
      (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      bounds?.bottom ?? window.innerHeight,
    ) - 24;
  const rootTop = root.getBoundingClientRect().top;
  // Measure the intrinsic content, excluding its decorative translation.
  const content = panel.firstElementChild?.firstElementChild as HTMLElement;
  const finalHeight = content.offsetHeight;
  const height = panel.getBoundingClientRect().top - rootTop + finalHeight;
  const alreadyVisible = rootTop >= top && rootTop + height <= bottom;
  if (alreadyVisible && !switching) {
    return () => {};
  }
  const targetTop = alreadyVisible
    ? rootTop
    : height <= bottom - top
      ? top + (bottom - top - height) / 2
      : top;
  const target = Math.max(0, scroller.scrollTop + rootTop - targetTop);
  return followPanelHeight(root, panel, scroller, target, finalHeight, true);
}
