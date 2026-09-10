"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { accommodateReadyContent } from "@/lib/viewport-scroll";
import { releaseCollapsedViewport } from "@/lib/viewport-scroll";
import {
  dismissSoundProps,
  linkSoundProps,
  quietLinkClassName,
  softLinkClassName,
  toggleSoundProps,
} from "@/components/links";

export type HomeAction = { id: string; label: string } & (
  { content: ReactNode; href?: never } | { href: string; content?: never }
);

type HomeActionsContextValue = {
  activeAction: string | null;
  closeAction: (id: string) => void;
  openAction: (id: string) => void;
};

const HomeActionsContext = createContext<HomeActionsContextValue | null>(null);

export function useHomeActions() {
  const context = useContext(HomeActionsContext);
  if (!context) {
    throw new Error("useHomeActions must be used within HomeActions");
  }
  return context;
}

/** Stable IDs preserve each mounted panel's draft while it is collapsed. */
export function HomeActions({
  actions,
  closeLabel,
  initialAction = null,
}: {
  actions: readonly HomeAction[];
  closeLabel: string;
  initialAction?: string | null;
}) {
  const [active, setActive] = useState<string | null>(initialAction);
  const root = useRef<HTMLDivElement>(null);
  const previousAction = useRef<string | null>(null);
  useLayoutEffect(() => {
    const previous = previousAction.current;
    const panelId = active ?? previous;
    previousAction.current = active;
    if (!panelId || !root.current) {
      return;
    }
    const panel = document.getElementById(`action-${panelId}-panel`);
    if (panel) {
      return active
        ? accommodateReadyContent(root.current, panel, previous !== null)
        : releaseCollapsedViewport(root.current, panel);
    }
  }, [active]);
  const triggers = useRef(new Map<string, HTMLButtonElement>());

  function close(id: string) {
    triggers.current.get(id)?.focus({ preventScroll: true });
    setActive(null);
  }

  function open(id: string) {
    if (
      !actions.some((action) => action.id === id && action.href === undefined)
    ) {
      return;
    }
    triggers.current.get(id)?.focus({ preventScroll: true });
    setActive(id);
  }

  return (
    <HomeActionsContext.Provider
      value={{ activeAction: active, closeAction: close, openAction: open }}
    >
      <div
        ref={root}
        data-action-open={active !== null}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented && active) {
            event.stopPropagation();
            close(active);
          }
        }}
      >
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {actions.map((action) => (
            <span
              key={action.id}
              className={`hover:blur-0 focus-within:blur-0 transition-[filter,opacity] duration-[240ms] ease-out focus-within:opacity-100 hover:opacity-100 motion-reduce:transition-none ${active !== null && active !== action.id ? "opacity-35 blur-[1.5px]" : "blur-0 opacity-100"}`}
            >
              {action.href !== undefined ? (
                <Link
                  {...linkSoundProps}
                  className={quietLinkClassName}
                  href={action.href}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  {...toggleSoundProps}
                  type="button"
                  id={`action-${action.id}-trigger`}
                  ref={(node) => {
                    if (node) {
                      triggers.current.set(action.id, node);
                    } else {
                      triggers.current.delete(action.id);
                    }
                  }}
                  aria-expanded={active === action.id}
                  aria-controls={`action-${action.id}-panel`}
                  className={`${quietLinkClassName} cursor-pointer text-left ${active === action.id ? "text-black dark:text-white" : ""}`}
                  onClick={() =>
                    setActive(active === action.id ? null : action.id)
                  }
                >
                  {action.label}
                </button>
              )}
            </span>
          ))}
        </div>
        {actions.map((action) =>
          action.href === undefined ? (
            <section
              key={action.id}
              id={`action-${action.id}-panel`}
              aria-labelledby={`action-${action.id}-trigger`}
              aria-hidden={active !== action.id}
              inert={active !== action.id ? true : undefined}
              className={`grid transition-[grid-template-rows,opacity] duration-[400ms,160ms] ease-[cubic-bezier(0.4,0,0.2,1),ease-out] motion-reduce:transition-none ${active === action.id ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
            >
              <div className="min-h-0 overflow-x-visible overflow-y-clip">
                <div
                  className={`pt-6 pb-1 transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.9,0.3,1.15)] motion-reduce:transform-none motion-reduce:transition-none ${active === action.id ? "translate-y-0" : "translate-y-2"}`}
                >
                  {action.content}
                  <button
                    {...dismissSoundProps}
                    type="button"
                    className={`${softLinkClassName} mt-5 -ml-4 cursor-pointer`}
                    onClick={() => close(action.id)}
                  >
                    {closeLabel}
                  </button>
                </div>
              </div>
            </section>
          ) : null,
        )}
      </div>
    </HomeActionsContext.Provider>
  );
}
