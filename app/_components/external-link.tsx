import type { ComponentProps } from "react";
import Link from "next/link";

type ExternalLinkProps = Omit<
  ComponentProps<typeof Link>,
  "rel" | "target"
>;

export const linkFocusClassName =
  "touch-manipulation focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-foreground";

export const textLinkClassName = `${linkFocusClassName} underline [text-decoration-skip-ink:auto] [text-decoration-thickness:from-font] underline-offset-[0.28em] hover:decoration-[0.12em]`;

export function ExternalLink({
  children,
  className,
  ...props
}: ExternalLinkProps) {
  return (
    <Link
      {...props}
      className={`${textLinkClassName} ${className ?? ""}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </Link>
  );
}
