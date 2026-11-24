import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { const path=`/${(process.env.ADMIN_PATH || "admin-la-fiesta").replace(/^\/+|\/+$/g, "")}`; return { rules: [{ userAgent: "*", allow: "/", disallow: [path,`${path}/`] }], sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"}/sitemap.xml` }; }
