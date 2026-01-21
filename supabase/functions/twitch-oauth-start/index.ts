// Twitch OAuth start: returns authorization URL (server-generated state)
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

function randomState() {
  // 32 bytes hex
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUser = getUserClient(req);
    const { data: userRes, error: uErr } = await supabaseUser.auth.getUser();
    if (uErr || !userRes.user) return json({ error: "Not authenticated" }, 401);

    const { redirectTo } = (await req.json().catch(() => ({}))) as { redirectTo?: string };
    const redirectBack = redirectTo || `${new URL(req.url).origin}/`;

    const state = randomState();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const admin = getServiceClient();
    const { error: sErr } = await admin.from("oauth_states").insert({
      user_id: userRes.user.id,
      provider: "twitch",
      state,
      redirect_to: redirectBack,
      expires_at: expiresAt,
    });
    if (sErr) throw sErr;

    const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/twitch-oauth-callback`;

    const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "user:read:email");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("force_verify", "true");

    return json({ url: authUrl.toString() });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "Erro" }, 500);
  }
});
