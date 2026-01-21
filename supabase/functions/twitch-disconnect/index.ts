import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getUserClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") || "",
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUser = getUserClient(req);
    const { data: userRes } = await supabaseUser.auth.getUser();
    if (!userRes.user) return json({ error: "Not authenticated" }, 401);

    const admin = getServiceClient();

    // Remove stored tokens
    await admin.from("twitch_connections").delete().eq("user_id", userRes.user.id);

    // Keep a public row but mark as offline (so UI can still query safely)
    await admin
      .from("twitch_live_status")
      .upsert(
        {
          user_id: userRes.user.id,
          twitch_login: "",
          is_live: false,
          title: null,
          game_name: null,
          viewer_count: null,
          thumbnail_url: null,
          started_at: null,
        },
        { onConflict: "user_id" }
      );

    return json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "Erro" }, 500);
  }
});
