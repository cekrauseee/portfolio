import type { MetadataRoute } from "next";
import { assessMyFitFlag } from "@/flags";
import { site } from "@/config/site";
import { projects } from "@/content/portfolio";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const isAssessMyFitEnabled = await assessMyFitFlag();
  const baseUrls: MetadataRoute.Sitemap = [
    {
      url: site.url,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  if (isAssessMyFitEnabled) {
    baseUrls.push({
      url: `${site.url}/fit`,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return [
    ...baseUrls,
    {
      url: `${site.url}/schedule`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...projects.map((project) => ({
      url: `${site.url}/projects/${project.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
