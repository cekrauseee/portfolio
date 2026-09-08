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
