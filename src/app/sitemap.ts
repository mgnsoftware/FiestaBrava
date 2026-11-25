import type { MetadataRoute } from "next";
export const dynamic = "force-static";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mgnsoftware.github.io/FiestaBrava").replace(/\/$/, "");
export default function sitemap(): MetadataRoute.Sitemap { return [{ url: `${siteUrl}/`, lastModified: new Date() }]; }
