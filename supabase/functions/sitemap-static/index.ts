import { detectSiteUrl, xmlResponse, buildUrlset, type UrlEntry } from "../_sitemap_shared.ts";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const siteUrl = detectSiteUrl(req);

  const urls: UrlEntry[] = [
    { loc: `${siteUrl}/`, changefreq: "daily", priority: 1.0 },
    { loc: `${siteUrl}/scrims`, changefreq: "hourly", priority: 0.95 },
    { loc: `${siteUrl}/ranking`, changefreq: "daily", priority: 0.85 },
    { loc: `${siteUrl}/equipes`, changefreq: "daily", priority: 0.85 },
    { loc: `${siteUrl}/faq`, changefreq: "monthly", priority: 0.55 },
    { loc: `${siteUrl}/terms`, changefreq: "yearly", priority: 0.2 },
    { loc: `${siteUrl}/privacy`, changefreq: "yearly", priority: 0.2 },

    // Overlays (OBS)
    { loc: `${siteUrl}/overlays/tabela-geral`, changefreq: "monthly", priority: 0.1 },
    { loc: `${siteUrl}/overlays/queda`, changefreq: "monthly", priority: 0.1 },
    { loc: `${siteUrl}/overlays/rodada`, changefreq: "monthly", priority: 0.1 },
    { loc: `${siteUrl}/overlays/mvp`, changefreq: "monthly", priority: 0.1 },

    // compat: urls antigas (html)
    { loc: `${siteUrl}/overlays/overlay-tabela-geral.html`, changefreq: "yearly", priority: 0.05 },
    { loc: `${siteUrl}/overlays/overlay-queda.html`, changefreq: "yearly", priority: 0.05 },
    { loc: `${siteUrl}/overlays/overlay-rodada.html`, changefreq: "yearly", priority: 0.05 },
    { loc: `${siteUrl}/overlays/overlay-mvp.html`, changefreq: "yearly", priority: 0.05 },
  ];

  const xml = buildUrlset(urls);
  if (req.method === "HEAD") return xmlResponse("");
  return xmlResponse(xml);
});
