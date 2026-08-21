import { Fragment } from "react";
import { profile, socialLinks } from "@/content/portfolio";
import { ExternalLink } from "@/components/links";
import { PreferencesMenu } from "@/components/preferences-menu";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

export function SiteNavigation({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary["navigation"];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
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

      <PreferencesMenu key={locale} locale={locale} dictionary={dictionary} />
    </div>
  );
}
