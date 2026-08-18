import type { ComponentProps } from "react";

type ExternalLinkProps = Omit<ComponentProps<"a">, "rel" | "target">;

export const linkFocusClassName =
  "touch-manipulation focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground";

export const textLinkClassName = `${linkFocusClassName} underline [text-decoration-skip-ink:auto] [text-decoration-thickness:from-font] underline-offset-[0.28em] hover:decoration-[0.12em]`;

export const actionClassName = `${linkFocusClassName} inline-flex w-fit cursor-pointer items-center justify-center bg-black px-4 py-2 text-sm text-white no-underline hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80`;

export function ExternalLink({
  children,
  className,
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
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
