import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { projects } from "@/content/portfolio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/fit`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
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
