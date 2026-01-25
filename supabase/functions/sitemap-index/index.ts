import { detectSiteUrl, xmlResponse, buildSitemapIndex } from "../_sitemap_shared.ts";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const siteUrl = detectSiteUrl(req);
  const now = new Date().toISOString();

  const xml = buildSitemapIndex([
    { loc: `${siteUrl}/sitemap-static.xml`, lastmod: now },
    { loc: `${siteUrl}/sitemap-trainings.xml`, lastmod: now },
    { loc: `${siteUrl}/sitemap-profiles.xml`, lastmod: now },
  ]);

  if (req.method === "HEAD") return xmlResponse("");
  return xmlResponse(xml);
});
