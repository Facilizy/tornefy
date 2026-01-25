import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { detectSiteUrl, xmlResponse, buildUrlset, type UrlEntry } from "../_sitemap_shared.ts";

function getPublicClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const siteUrl = detectSiteUrl(req);
    const supabase = getPublicClient();
    const trainingsRes = await supabase
      .from("trainings")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50000);
    if (trainingsRes.error) throw trainingsRes.error;

    const urls: UrlEntry[] = (trainingsRes.data || []).map((t: any) => ({
      loc: `${siteUrl}/training/${encodeURIComponent(String(t.id))}`,
      lastmod: t.updated_at ? new Date(t.updated_at).toISOString() : null,
      changefreq: "daily",
      priority: 0.7,
    }));

    const xml = buildUrlset(urls);
    if (req.method === "HEAD") return xmlResponse("");
    return xmlResponse(xml);
  } catch (e) {
    console.error("sitemap-trainings error", e);
    return new Response("Internal error", { status: 500 });
  }
});
