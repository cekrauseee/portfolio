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
import { stabilizeViewportAnchor } from "@/lib/viewport-scroll";

type ProjectPreview = {
  slug: string;
  name: string;
  description: string;
  languageTag: string;
};

export function ProjectCollapsibleList({
  projects,
  children,
}: {
  projects: readonly ProjectPreview[];
  children: ReactNode;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorFrameRef = useRef<number | null>(null);
  const contents = Children.toArray(children);

  useLayoutEffect(() => {
    const main = rootRef.current?.closest<HTMLElement>("main");
    if (!main) {
      return;
    }

    const scrollContainer = main;

    const { overflowY } = window.getComputedStyle(scrollContainer);
    if (overflowY !== "auto" && overflowY !== "scroll") {
      return;
    }

    let remainingFrames = 36;
    let frame: number | null = null;

    function keepRootScrollReset() {
      if (!scrollContainer.isConnected) {
        return;
      }

      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }

      remainingFrames -= 1;
      if (remainingFrames > 0) {
        frame = requestAnimationFrame(keepRootScrollReset);
      }
    }

    keepRootScrollReset();

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  function preserveViewportPosition(anchor: HTMLElement) {
    if (anchorFrameRef.current !== null) {
      cancelAnimationFrame(anchorFrameRef.current);
    }

    const targetTop = anchor.getBoundingClientRect().top;
    let remainingFrames = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 1
      : 36;

    function keepAnchorStable() {
      if (!anchor.isConnected) {
        anchorFrameRef.current = null;
        return;
      }

      stabilizeViewportAnchor(anchor, targetTop);

      remainingFrames -= 1;

      if (remainingFrames > 0) {
        anchorFrameRef.current = requestAnimationFrame(keepAnchorStable);
      } else {
        anchorFrameRef.current = null;
      }
    }

    anchorFrameRef.current = requestAnimationFrame(keepAnchorStable);
  }

  function toggleProject(slug: string, trigger: HTMLButtonElement) {
    const nextSlug = openSlug === slug ? null : slug;

    if (openSlug && nextSlug && openSlug !== nextSlug) {
      preserveViewportPosition(trigger);
    }

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

      setOpenSlug(null);
      document.getElementById(`project-${openSlug}-trigger`)?.focus();
    }

    function handleClick(event: MouseEvent) {
      if (
        !rootRef.current ||
        !(event.target instanceof Element) ||
        rootRef.current.contains(event.target)
      ) {
        return;
      }

      const anchor = event.target.closest<HTMLElement>(
        "button, a, input, select, textarea, [tabindex]",
      );

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
  }, [openSlug]);

  useEffect(
    () => () => {
      if (anchorFrameRef.current !== null) {
        cancelAnimationFrame(anchorFrameRef.current);
      }
    },
    [],
  );

  return (
    <div className="flex flex-col gap-5" ref={rootRef}>
      {projects.map((project, index) => {
        const isOpen = openSlug === project.slug;
        const isDimmed = openSlug !== null && !isOpen;
        const triggerId = `project-${project.slug}-trigger`;
        const panelId = `project-${project.slug}-panel`;

        return (
          <article
            className={`home-enter-item project-collapsible-item transition-[filter,opacity] duration-300 ease-out motion-reduce:transition-none ${
              isDimmed ? "opacity-35 blur-[1.5px]" : "blur-0 opacity-100"
            }`}
            data-project-expanded={isOpen ? "true" : undefined}
            key={project.slug}
            style={{ animationDelay: `${315 + index * 45}ms` }}
          >
            <button
              {...toggleSoundProps}
              aria-controls={panelId}
              aria-expanded={isOpen}
              className={`${focusVisibleClassName} group block w-full cursor-pointer touch-manipulation text-left`}
              id={triggerId}
              onClick={(event) =>
                toggleProject(project.slug, event.currentTarget)
              }
              type="button"
            >
              <span className="block w-fit text-[0.98rem] leading-6 font-medium text-black/74 transition-colors group-hover:text-black dark:text-white/74 dark:group-hover:text-white">
                {project.name}
              </span>
              <span
                className="mt-1 block max-w-[52ch] text-[0.9rem] leading-6 font-normal text-black/44 dark:text-white/48"
                lang={project.languageTag}
              >
                {project.description}
              </span>
            </button>

            <div
              aria-hidden={!isOpen}
              aria-labelledby={triggerId}
              className={`project-collapsible-panel grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0"
              }`}
              id={panelId}
              inert={isOpen ? undefined : true}
              role="region"
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pb-2">{contents[index]}</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
