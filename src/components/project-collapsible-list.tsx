"use client";

import {
  Children,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { focusVisibleClassName, toggleSoundProps } from "@/components/links";
import {
  accommodateExpandedContent,
  releaseCollapsedViewport,
  stabilizeViewportAnchor,
} from "@/lib/viewport-scroll";

const PANEL_TRANSITION_MS = 400;

type CollapsiblePreview = {
  slug: string;
  name: string;
  description: string;
  languageTag?: string;
  meta?: string;
};

export function ProjectCollapsibleList({
  projects,
  children,
  idPrefix = "project",
}: {
  projects: readonly CollapsiblePreview[];
  children: ReactNode;
  idPrefix?: string;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelAnchorRef = useRef<(() => void) | null>(null);
  const contents = Children.toArray(children);
  const previousSlug = useRef<string | null>(null);

  useLayoutEffect(() => {
    const previous = previousSlug.current;
    previousSlug.current = openSlug;
    const slug = openSlug ?? previous;
    if (!slug || !rootRef.current || cancelAnchorRef.current) {
      return;
    }
    const panel = document.getElementById(`${idPrefix}-${slug}-panel`);
    const article = panel?.closest("article");
    if (panel && article) {
      return openSlug
        ? accommodateExpandedContent(article, panel, previous !== null)
        : releaseCollapsedViewport(rootRef.current, panel);
    }
  }, [idPrefix, openSlug]);

  function preserveViewportPosition(anchor: HTMLElement) {
    cancelAnchorRef.current?.();

    const targetTop = anchor.getBoundingClientRect().top;
    const main = anchor.closest<HTMLElement>("main");
    const hasScrollContainer =
      main && /^(auto|scroll)$/.test(window.getComputedStyle(main).overflowY);
    const readScrollTop = () =>
      hasScrollContainer ? main.scrollTop : window.scrollY;
    let expectedScrollTop = readScrollTop();
    let startedAt: number | null = null;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : PANEL_TRANSITION_MS;
    let frame: number | null = null;

    function cancel() {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      frame = null;
      for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
        window.removeEventListener(event, cancel, true);
      }
      if (cancelAnchorRef.current === cancel) {
        cancelAnchorRef.current = null;
      }
    }

    function keepAnchorStable(now: number) {
      startedAt ??= now;
      // User or external scrolling takes priority over our layout correction.
      if (
        !anchor.isConnected ||
        Math.abs(readScrollTop() - expectedScrollTop) > 0.5
      ) {
        cancel();
        return;
      }

      stabilizeViewportAnchor(anchor, targetTop);
      expectedScrollTop = readScrollTop();

      if (now - startedAt < duration) {
        frame = requestAnimationFrame(keepAnchorStable);
      } else {
        cancel();
      }
    }

    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
      window.addEventListener(event, cancel, { capture: true, passive: true });
    }
    cancelAnchorRef.current = cancel;
    frame = requestAnimationFrame(keepAnchorStable);
  }

  function toggleProject(slug: string) {
    cancelAnchorRef.current?.();
    const nextSlug = openSlug === slug ? null : slug;

    setOpenSlug(nextSlug);
  }

  useEffect(() => {
    if (!openSlug) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      cancelAnchorRef.current?.();
      setOpenSlug(null);
      document
        .getElementById(`${idPrefix}-${openSlug}-trigger`)
        ?.focus({ preventScroll: true });
    }

    function handleClick(event: MouseEvent) {
      if (
        !rootRef.current ||
        !(event.target instanceof Element) ||
        rootRef.current.contains(event.target) ||
        // Locale and theme changes preserve the expanded item. Closing it here
        // would interrupt the preference transition and collapse the panel.
        event.target.closest("[data-locale-switcher], [data-theme-switcher]")
      ) {
        return;
      }

      const anchor = event.target.closest<HTMLElement>(
        "button, a, input, select, textarea, [tabindex]",
      );

      cancelAnchorRef.current?.();
      setOpenSlug(null);

      if (anchor) {
        preserveViewportPosition(anchor);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
    };
  }, [idPrefix, openSlug]);

  useEffect(
    () => () => {
      cancelAnchorRef.current?.();
    },
    [],
  );

  return (
    <div className="flex flex-col gap-5" ref={rootRef}>
      {projects.map((project, index) => {
        const isOpen = openSlug === project.slug;
        const isDimmed = openSlug !== null && !isOpen;
        const triggerId = `${idPrefix}-${project.slug}-trigger`;
        const panelId = `${idPrefix}-${project.slug}-panel`;

        return (
          <article
            className={`animate-journal-fade origin-left transition-[filter,opacity] duration-[240ms] ease-out motion-reduce:animate-none motion-reduce:transition-none ${
              isDimmed ? "opacity-35 blur-[1.5px]" : "blur-0 opacity-100"
            }`}
            key={project.slug}
            style={{ animationDelay: `${Math.min(100 + index * 25, 220)}ms` }}
          >
            <h3 className="animate-journal-bounce origin-left motion-reduce:animate-none">
              <button
                {...toggleSoundProps}
                aria-controls={panelId}
                aria-expanded={isOpen}
                className={`${focusVisibleClassName} group block w-full cursor-pointer touch-manipulation text-left`}
                id={triggerId}
                onClick={() => toggleProject(project.slug)}
                type="button"
              >
                <span className="block text-[0.9375rem] leading-relaxed font-medium text-black/85 transition-colors group-hover:text-black dark:text-white/85 dark:group-hover:text-white">
                  {project.name}
                </span>
                <span
                  className="mt-1 block max-w-[52ch] text-sm leading-relaxed font-normal text-black/60 dark:text-white/65"
                  lang={project.languageTag}
                >
                  {project.description}
                  {project.meta ? <span> · {project.meta}</span> : null}
                </span>
              </button>
            </h3>

            <div
              aria-hidden={!isOpen}
              aria-labelledby={triggerId}
              className={`grid transition-[grid-template-rows,opacity] duration-[400ms,160ms] ease-[cubic-bezier(0.4,0,0.2,1),ease-out] motion-reduce:transition-none ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0"
              }`}
              id={panelId}
              inert={isOpen ? undefined : true}
              role="region"
            >
              <div className="min-h-0 overflow-x-visible overflow-y-clip">
                <div
                  className={`origin-top-left pb-1 transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.9,0.3,1.15)] motion-reduce:transform-none motion-reduce:transition-none ${isOpen ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"}`}
                >
                  {contents[index]}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
