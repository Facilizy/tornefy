// Sync current user's live status (polling) and update twitch_live_status
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

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string[];
  token_type: string;
};

async function refreshToken(refreshToken: string) {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET")!;

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.message || "Falha ao atualizar token");
  return json as TokenResponse;
}

async function twitchApi<T>(accessToken: string, path: string, query?: Record<string, string | undefined>) {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
  const url = new URL(`https://api.twitch.tv/helix/${path}`);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.message || `Erro Twitch API (${path})`);
  return json as T;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUser = getUserClient(req);
    const { data: userRes } = await supabaseUser.auth.getUser();
    if (!userRes.user) return json({ error: "Not authenticated" }, 401);

    const admin = getServiceClient();
    const { data: conn, error: cErr } = await admin
      .from("twitch_connections")
      .select("user_id, twitch_login, access_token, refresh_token, expires_at")
      .eq("user_id", userRes.user.id)
      .maybeSingle();
    if (cErr || !conn) return json({ error: "Twitch não conectado" }, 400);

    let accessToken = conn.access_token as string;
    const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0;
    if (expiresAt && expiresAt < Date.now() + 60_000) {
      if (!conn.refresh_token) return json({ error: "Refresh token ausente" }, 400);
      const tokens = await refreshToken(conn.refresh_token);
      accessToken = tokens.access_token;
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      await admin
        .from("twitch_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || conn.refresh_token,
          expires_at: newExpiresAt,
          token_type: tokens.token_type,
          scope: Array.isArray(tokens.scope) ? tokens.scope.join(" ") : null,
        })
        .eq("user_id", userRes.user.id);
    }

    // Streams
    const streams = await twitchApi<{
      data: Array<{
        id: string;
        user_login: string;
        title: string;
        game_id: string;
        game_name: string;
        viewer_count: number;
        thumbnail_url: string;
        started_at: string;
      }>;
    }>(accessToken, "streams", { user_login: conn.twitch_login });

    const stream = streams.data?.[0];
    const isLive = !!stream;

    const thumbnail = stream?.thumbnail_url
      ? stream.thumbnail_url.replace("{width}", "640").replace("{height}", "360")
      : null;

    const { error: upErr } = await admin.from("twitch_live_status").upsert(
      {
        user_id: userRes.user.id,
        twitch_login: conn.twitch_login,
        is_live: isLive,
        title: stream?.title || null,
        game_name: stream?.game_name || null,
        viewer_count: stream?.viewer_count ?? null,
        thumbnail_url: thumbnail,
        started_at: stream?.started_at || null,
      },
      { onConflict: "user_id" }
    );
    if (upErr) throw upErr;

    return json({ ok: true, is_live: isLive });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "Erro" }, 500);
  }
});
