import type { Metadata } from "next";
import Link from "next/link";
import { mutedTextLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { site } from "@/config/site";
import { NewMessage } from "@/features/guestbook/new-message";

const path = "/guestbook/new";
const title = "Leave a message";
const description = "Share a message that appears on the visitor globe.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    type: "website",
    url: path,
    title,
    description,
    siteName: site.name,
    locale: site.locale,
  },
};

export default function NewMessagePage() {
  return (
    <PageShell>
      <article className="max-w-[65ch]">
        <header>
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em] text-balance">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-black/75 dark:text-white/85">
            {description}
          </p>
        </header>

        <div className="mt-10 max-w-[32rem]">
          <NewMessage />
        </div>

        <footer className="mt-12 [@media(max-height:42rem)]:mt-9">
          <Link className={mutedTextLinkClassName} href="/guestbook">
            Back to globe
          </Link>
        </footer>
      </article>
    </PageShell>
  );
}
