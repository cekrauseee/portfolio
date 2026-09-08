import type { Locale } from "@/i18n/config";

export type ProjectTranslation = {
  readonly description: string;
  readonly metaDescription: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly content: string;
};

export type Project = {
  readonly slug: string;
  readonly name: string;
  readonly repositoryUrl: string;
  readonly assetBaseUrl: string;
  readonly translations: Readonly<
    Partial<Record<Locale, ProjectTranslation>>
  > & {
    readonly en: ProjectTranslation;
  };
};

export type LocalizedProject = Omit<Project, "translations"> &
  ProjectTranslation & {
    readonly contentLocale: Locale;
  };

export function localizeProject(
  project: Project,
  locale: Locale,
): LocalizedProject {
  const contentLocale = project.translations[locale] ? locale : "en";
  const translation = project.translations[locale] ?? project.translations.en;

  return {
    slug: project.slug,
    name: project.name,
    repositoryUrl: project.repositoryUrl,
    assetBaseUrl: project.assetBaseUrl,
    ...translation,
    contentLocale,
  };
}
