import type { ComponentProps } from "react";

export const focusVisibleClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground";

export const linkFocusClassName = `touch-manipulation ${focusVisibleClassName}`;

export const textLinkClassName = `${linkFocusClassName} underline [text-decoration-skip-ink:auto] [text-decoration-thickness:from-font] underline-offset-[0.28em] hover:decoration-[0.12em]`;

export const actionClassName = `${linkFocusClassName} inline-flex w-fit cursor-pointer items-center justify-center bg-black px-4 py-2 text-sm text-white no-underline hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80`;

export const mutedTextLinkClassName = `${linkFocusClassName} text-black/70 underline decoration-black/30 underline-offset-4 hover:text-black dark:text-white/75 dark:decoration-white/30 dark:hover:text-white`;

export const mutedButtonClassName = `${mutedTextLinkClassName} cursor-pointer`;

type ExternalLinkProps = Omit<ComponentProps<"a">, "rel" | "target"> & {
  newTabLabel?: string;
};

export function ExternalLink({
  children,
  className,
  newTabLabel = " (opens in a new tab)",
  ...props
}: ExternalLinkProps) {
  return (
    <a
      {...props}
      className={`${textLinkClassName} ${className ?? ""}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <span className="sr-only">{newTabLabel}</span>
    </a>
  );
}
