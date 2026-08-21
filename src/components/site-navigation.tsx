import { Fragment } from "react";
import { profile, socialLinks } from "@/content/portfolio";
import { ExternalLink } from "@/components/links";
import type { Dictionary } from "@/i18n/dictionary";

export function SiteNavigation({
  dictionary,
}: {
  dictionary: Dictionary["navigation"];
}) {
  return (
    <nav
      className="flex flex-wrap gap-x-2"
      aria-label={dictionary.primaryLinks}
    >
      <span>{profile.handle}</span>

      {socialLinks.map((link) => (
        <Fragment key={link.href}>
          <span aria-hidden="true">/</span>
          <ExternalLink
            href={link.href}
            newTabLabel={dictionary.externalLinkNewTab}
          >
            {link.label}
          </ExternalLink>
        </Fragment>
      ))}
    </nav>
  );
}
