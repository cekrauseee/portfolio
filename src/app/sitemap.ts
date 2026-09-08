import type { MetadataRoute } from "next";
import { site } from "@/config/site";

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
    {
      url: `${site.url}/guestbook`,
      changeFrequency: "daily",
      priority: 0.6,
    },
  ];
}
