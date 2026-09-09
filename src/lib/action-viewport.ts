/** Accommodate an opening action once; never track edits or viewport resizing. */
export function accommodateAction(root: HTMLElement, panel: HTMLElement) {
  const main = root.closest<HTMLElement>("main");
  const scroller =
    main && /^(auto|scroll)$/.test(getComputedStyle(main).overflowY)
      ? main
      : (document.scrollingElement as HTMLElement);
  const viewport = window.visualViewport;
  const bounds = main?.getBoundingClientRect();
  const top = Math.max(viewport?.offsetTop ?? 0, bounds?.top ?? 0) + 24;
  const bottom =
    Math.min(
      (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      bounds?.bottom ?? window.innerHeight,
    ) - 24;
  const rootTop = root.getBoundingClientRect().top;
  const content = panel.firstElementChild as HTMLElement;
  const height =
    panel.getBoundingClientRect().top - rootTop + content.scrollHeight;
  if (rootTop >= top && rootTop + height <= bottom) {
    return () => {};
  }
  const targetTop =
    height <= bottom - top ? top + (bottom - top - height) / 2 : top;
  const start = scroller.scrollTop;
  const target = Math.max(0, start + rootTop - targetTop);
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
    if (!root.isConnected || Math.abs(scroller.scrollTop - expected) > 1) {
      cancel();
      return;
    }
    started ??= now;
    const progress = duration ? Math.min(1, (now - started) / duration) : 1;
    scroller.scrollTo({
      top: start + (target - start) * (1 - Math.pow(1 - progress, 3)),
      behavior: "instant",
    });
    expected = scroller.scrollTop;
    if (progress < 1) {
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
