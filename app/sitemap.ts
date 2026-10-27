import type { MetadataRoute } from "next";
import { getPublicContentData } from "@server/api/public/content";

const SITE_URL = "https://www.rongdhonubd.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { business, services, reviews, team, work } = await getPublicContentData();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/services`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/reviews`, changeFrequency: "weekly", priority: 0.7 },
  ];

  if (business?.workSlug) entries.push({ url: `${SITE_URL}/${business.workSlug}`, changeFrequency: "weekly", priority: 0.9 });
  if (business?.teamSlug) entries.push({ url: `${SITE_URL}/${business.teamSlug}`, changeFrequency: "monthly", priority: 0.7 });

  for (const item of services) entries.push({ url: `${SITE_URL}/services/${item.slug}`, changeFrequency: "monthly", priority: 0.75 });
  for (const item of reviews.filter((review) => review.source !== "user")) entries.push({ url: `${SITE_URL}/reviews/${item.slug}`, changeFrequency: "monthly", priority: 0.55 });
  if (business?.workSlug) for (const item of work) entries.push({ url: `${SITE_URL}/${business.workSlug}/${item.slug}`, changeFrequency: "monthly", priority: 0.8 });
  if (business?.teamSlug) for (const item of team) entries.push({ url: `${SITE_URL}/${business.teamSlug}/${item.slug}`, changeFrequency: "monthly", priority: 0.6 });

  return entries;
}
