import { Fragment } from "react";
import { profile, socialLinks } from "@/content/portfolio";
import { ExternalLink } from "@/components/links";

export function SiteNavigation() {
  return (
    <nav className="flex flex-wrap gap-x-2" aria-label="Primary links">
      <span>{profile.handle}</span>

      {socialLinks.map((link) => (
        <Fragment key={link.href}>
          <span aria-hidden="true">/</span>
          <ExternalLink href={link.href}>{link.label}</ExternalLink>
        </Fragment>
      ))}
    </nav>
  );
}
