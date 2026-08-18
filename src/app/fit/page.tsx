import type { Metadata } from "next";
import Link from "next/link";
import { mutedTextLinkClassName } from "@/components/links";
import { PageShell } from "@/components/page-shell";
import { site } from "@/config/site";
import { RoleFitForm } from "@/features/role-fit/role-fit-form";

const path = "/fit";

export const metadata: Metadata = {
  title: "Assess my fit",
  description:
    "Compare a role with Henrique Krause's published software engineering experience.",
  alternates: {
    canonical: path,
  },
  openGraph: {
    type: "website",
    url: path,
    title: "Assess my fit",
    description:
      "Compare a role with Henrique Krause's published software engineering experience.",
    siteName: site.name,
    locale: site.locale,
  },
};

export default function FitPage() {
  return (
    <PageShell>
      <article className="max-w-[65ch]">
        <header>
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.02em] text-balance">
            Assess my fit
          </h1>
          <p className="mt-4 text-base leading-7 text-black/75 dark:text-white/85">
            Paste a role description to compare it with my experience.
          </p>
        </header>

        <div className="mt-10">
          <RoleFitForm />
        </div>

        <footer className="mt-12 [@media(max-height:42rem)]:mt-9">
          <Link className={mutedTextLinkClassName} href="/">
            Back
          </Link>
        </footer>
      </article>
    </PageShell>
  );
}
