import type { MetadataRoute } from "next";
import { getSiteSeo } from "@/seo/site-seo";
import { getProjectSlugs, getActivePackages } from "@/lib/db/queries";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteSeo = getSiteSeo();
  const slugs = getProjectSlugs();
  const packages = getActivePackages();

  const projects: MetadataRoute.Sitemap = slugs.map((item) => ({
    url: `${siteSeo.siteUrl}/portfolio/${item.slug}`,
    lastModified: item.updatedAt ?? undefined,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: siteSeo.siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteSeo.siteUrl}/portfolio`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteSeo.siteUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteSeo.siteUrl}/team`,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${siteSeo.siteUrl}/packages`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteSeo.siteUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...projects,
    ...packages.map((pkg) => ({
      url: `${siteSeo.siteUrl}/packages/${pkg.slug}`,
      lastModified: pkg.updatedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
