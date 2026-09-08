export function stabilizeViewportAnchor(
  anchor: HTMLElement,
  targetTop: number,
) {
  const main = anchor.closest<HTMLElement>("main");

  if (main) {
    const { overflowY } = window.getComputedStyle(main);
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      main.scrollHeight > main.clientHeight;

    if (isScrollable) {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }

      const delta = anchor.getBoundingClientRect().top - targetTop;
      if (Math.abs(delta) <= 0.5) {
        return;
      }

      main.scrollBy(0, delta);
      return;
    }
  }

  const delta = anchor.getBoundingClientRect().top - targetTop;
  if (Math.abs(delta) <= 0.5) {
    return;
  }

  window.scrollBy(0, delta);
}
