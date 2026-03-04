// @ts-ignore: Deno import via URL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

// Declare Deno to prevent TS errors in non-Deno workspace
declare const Deno: any;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function detectSiteUrl(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const proto = forwardedProto?.split(",")[0]?.trim() || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  if (host) return `${proto}://${host}`;
  return "https://tornefy.com.br";
}

function xmlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache at the edge/CDN (Vercel/Cloudflare/etc.)
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function getPublicClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type UrlEntry = {
  loc: string;
  lastmod?: string | null;
  changefreq?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function buildSitemap(urls: UrlEntry[]) {
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

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const siteUrl = detectSiteUrl(req);
    const supabase = getPublicClient();

    const [trainingsRes, profilesRes] = await Promise.all([
      supabase.from("trainings").select("id, updated_at").order("updated_at", { ascending: false }).limit(5000),
      supabase.from("profiles").select("id, updated_at").order("updated_at", { ascending: false }).limit(5000),
    ]);

    if (trainingsRes.error) throw trainingsRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const staticUrls: UrlEntry[] = [
      { loc: `${siteUrl}/`, changefreq: "daily", priority: 1.0 },
      { loc: `${siteUrl}/scrims`, changefreq: "hourly", priority: 0.95 },
      { loc: `${siteUrl}/ranking`, changefreq: "daily", priority: 0.85 },
      { loc: `${siteUrl}/equipes`, changefreq: "daily", priority: 0.85 },
      { loc: `${siteUrl}/faq`, changefreq: "monthly", priority: 0.55 },
      { loc: `${siteUrl}/terms`, changefreq: "yearly", priority: 0.2 },
      { loc: `${siteUrl}/privacy`, changefreq: "yearly", priority: 0.2 },
    ];

    const overlayUrls: UrlEntry[] = [
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

    const trainingUrls: UrlEntry[] = (trainingsRes.data || []).map((t: any) => ({
      loc: `${siteUrl}/training/${encodeURIComponent(String(t.id))}`,
      lastmod: t.updated_at ? new Date(t.updated_at).toISOString() : null,
      changefreq: "daily",
      priority: 0.7,
    }));

    const profileUrls: UrlEntry[] = (profilesRes.data || []).map((p: any) => ({
      loc: `${siteUrl}/profile/${encodeURIComponent(String(p.id))}`,
      lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : null,
      changefreq: "weekly",
      priority: 0.6,
    }));

    const xml = buildSitemap([...staticUrls, ...overlayUrls, ...trainingUrls, ...profileUrls]);
    if (req.method === "HEAD") return xmlResponse("");
    return xmlResponse(xml);
  } catch (e: any) {
    console.error("sitemap error", e);
    return new Response("Internal error", { status: 500 });
  }
});
