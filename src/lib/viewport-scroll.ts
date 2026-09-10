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

/** Follow a growing response until the visitor takes control of the viewport. */
export function createStreamingScrollFollower(root: HTMLElement) {
  const scroller = getViewportScroller(root);
  const main = root.closest<HTMLElement>("main");
  const windowTarget = window;
  const viewport = windowTarget.visualViewport;
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  let active = true;
  let expected = scroller.scrollTop;

  function cancel() {
    if (!active) {
      return;
    }
    active = false;
    for (const event of events) {
      windowTarget.removeEventListener(event, cancel, true);
    }
    windowTarget.removeEventListener("resize", cancel);
    viewport?.removeEventListener("resize", cancel);
    scroller.removeEventListener("scroll", handleScroll);
  }

  function handleScroll() {
    if (Math.abs(scroller.scrollTop - expected) > 1) {
      cancel();
    }
  }

  function follow(edge: HTMLElement) {
    if (
      !active ||
      !root.isConnected ||
      !edge.isConnected ||
      Math.abs(scroller.scrollTop - expected) > 1
    ) {
      cancel();
      return;
    }

    const bounds = main?.getBoundingClientRect();
    const viewportBottom =
      (viewport?.offsetTop ?? 0) +
      (viewport?.height ?? windowTarget.innerHeight);
    const bottom =
      Math.min(viewportBottom, bounds?.bottom ?? viewportBottom) - 24;
    const overflow = edge.getBoundingClientRect().bottom - bottom;
    if (overflow <= 0.5) {
      return;
    }

    const maxScroll = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight,
    );
    scroller.scrollTo({
      top: Math.min(scroller.scrollTop + overflow, maxScroll),
      behavior: "instant",
    });
    expected = scroller.scrollTop;
  }

  for (const event of events) {
    windowTarget.addEventListener(event, cancel, {
      capture: true,
      passive: true,
    });
  }
  windowTarget.addEventListener("resize", cancel);
  viewport?.addEventListener("resize", cancel);
  scroller.addEventListener("scroll", handleScroll, { passive: true });

  return { cancel, follow };
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
    : 400;
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

/** Wait for async content before measuring an opening panel, yielding to input. */
export function accommodateReadyContent(
  root: HTMLElement,
  panel: HTMLElement,
  switching = false,
) {
  const pending = () =>
    panel.querySelector('[data-action-layout-pending="true"]');
  if (!pending()) {
    return accommodateExpandedContent(root, panel, switching);
  }

  const scroller = getViewportScroller(root);
  const events = [
    "wheel",
    "touchstart",
    "pointerdown",
    "keydown",
    "resize",
  ] as const;
  let stopFollowing = () => {};
  const observer = new MutationObserver(() => {
    if (pending()) {
      return;
    }
    stopWaiting();
    if (root.isConnected) {
      stopFollowing = accommodateExpandedContent(root, panel, switching);
    }
  });
  function stopWaiting() {
    observer.disconnect();
    for (const event of events) {
      window.removeEventListener(event, cancel, true);
    }
    scroller.removeEventListener("scroll", cancel);
    window.removeEventListener("scroll", cancel, true);
    window.visualViewport?.removeEventListener("resize", cancel);
  }
  function cancel() {
    stopWaiting();
    stopFollowing();
  }
  for (const event of events) {
    window.addEventListener(event, cancel, { capture: true, passive: true });
  }
  scroller.addEventListener("scroll", cancel, { passive: true });
  window.addEventListener("scroll", cancel, { capture: true, passive: true });
  window.visualViewport?.addEventListener("resize", cancel);
  observer.observe(panel, {
    attributes: true,
    subtree: true,
    attributeFilter: ["data-action-layout-pending"],
  });
  return cancel;
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
  let collapsingHeightBefore = 0;
  if (switching) {
    for (
      let sibling = panel.previousElementSibling as HTMLElement | null;
      sibling;
      sibling = sibling.previousElementSibling as HTMLElement | null
    ) {
      if (sibling.getAttribute("aria-hidden") === "true") {
        collapsingHeightBefore += sibling.getBoundingClientRect().height;
      }
    }
  }
  // Measure the intrinsic content, excluding its decorative translation.
  const content = panel.firstElementChild?.firstElementChild as HTMLElement;
  const finalHeight = content.offsetHeight;
  const height =
    panel.getBoundingClientRect().top -
    collapsingHeightBefore -
    rootTop +
    finalHeight;
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
