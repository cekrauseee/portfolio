export type ProjectSection = {
  readonly title: string;
  readonly paragraphs: readonly string[];
};

export type Project = {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly repositoryUrl: string;
  readonly metaDescription: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly sections: readonly ProjectSection[];
};
