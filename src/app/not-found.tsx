import Link from "next/link";
import { mutedTextLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell size="compact">
      <section aria-labelledby="not-found-heading">
        <p className="text-black/55 dark:text-white/65">404</p>
        <h1
          id="not-found-heading"
          className="mt-1 text-xl leading-7 font-medium tracking-[-0.02em]"
        >
          Page not found
        </h1>
        <p className="mt-3 max-w-[42ch] leading-6 text-black/70 dark:text-white/80">
          There is nothing at this address.
        </p>
        <Link
          className={`${mutedTextLinkClassName} mt-5 inline-block`}
          href="/"
        >
          Return to portfolio
        </Link>
      </section>
    </PageShell>
  );
}
