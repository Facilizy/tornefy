// Shared helpers for sitemap edge functions.
// NOTE: Supabase Edge Functions support importing sibling files.

export type UrlEntry = {
  loc: string;
  lastmod?: string | null;
  changefreq?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function detectSiteUrl(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const proto = forwardedProto?.split(",")[0]?.trim() || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  if (host) return `${proto}://${host}`;
  return "https://blank-canvas-magic-743.lovable.app";
}

export function xmlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export function buildUrlset(urls: UrlEntry[]) {
  const rows = urls
    .map((u) => {
      const parts = [
        `    <loc>${escapeXml(u.loc)}</loc>`,
        u.lastmod ? `    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : null,
        u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : null,
        typeof u.priority === "number" ? `    <priority>${u.priority.toFixed(1)}</priority>` : null,
      ].filter(Boolean);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>`;
}

export function buildSitemapIndex(items: Array<{ loc: string; lastmod?: string | null }>) {
  const rows = items
    .map((it) => {
      const parts = [
        `    <loc>${escapeXml(it.loc)}</loc>`,
        it.lastmod ? `    <lastmod>${escapeXml(it.lastmod)}</lastmod>` : null,
      ].filter(Boolean);
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>`;
}
