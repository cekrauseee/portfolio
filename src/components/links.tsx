import type { ComponentProps } from "react";

export const focusVisibleClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground";

export const linkFocusClassName = `touch-manipulation ${focusVisibleClassName}`;

export const textLinkClassName = `${linkFocusClassName} underline [text-decoration-skip-ink:auto] [text-decoration-thickness:from-font] underline-offset-[0.28em] hover:decoration-[0.12em]`;

export const quietLinkClassName = `${linkFocusClassName} min-h-6 font-medium no-underline text-black/85 transition-colors duration-200 ease-out hover:text-black motion-reduce:transition-none dark:text-white/85 dark:hover:text-white`;

export const softLinkClassName = `${linkFocusClassName} inline-flex min-h-8 items-center rounded-full bg-transparent px-3 py-1 text-[0.8125rem] leading-5 font-medium text-black/80 no-underline transition-[background-color,color,scale] duration-200 ease-out hover:bg-black/[0.05] hover:text-black focus-visible:bg-black/[0.05] motion-safe:active:scale-[0.97] motion-reduce:transition-none dark:text-white/85 dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:bg-white/[0.08]`;

export const actionClassName = `${linkFocusClassName} inline-flex w-fit cursor-pointer items-center justify-center bg-black px-4 py-2 text-sm text-white no-underline hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80`;

export const mutedTextLinkClassName = `${linkFocusClassName} text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black dark:text-white/75 dark:decoration-white/30 dark:hover:text-white`;

export const mutedButtonClassName = `${mutedTextLinkClassName} cursor-pointer`;

export const linkSoundProps = {
  "data-cuelume-hover": "tick",
  "data-cuelume-press": "press",
  "data-cuelume-release": "release",
} as const;

export const actionSoundProps = {
  "data-cuelume-press": "pulse",
} as const;

export const toggleSoundProps = {
  "data-cuelume-toggle": "toggle",
} as const;

export const dismissSoundProps = {
  "data-cuelume-press": "droplet",
} as const;

type ExternalLinkProps = Omit<ComponentProps<"a">, "rel" | "target"> & {
  newTabLabel?: string;
  appearance?: "text" | "quiet" | "soft";
};

export function ExternalLink({
  children,
  className,
  newTabLabel = " (opens in a new tab)",
  appearance = "text",
  ...props
}: ExternalLinkProps) {
  const linkClassName = {
    text: textLinkClassName,
    quiet: quietLinkClassName,
    soft: softLinkClassName,
  }[appearance];

  return (
    <a
      {...linkSoundProps}
      {...props}
      className={`${linkClassName} ${className ?? ""}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <span className="sr-only">{newTabLabel}</span>
    </a>
  );
}
