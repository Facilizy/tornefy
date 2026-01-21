// Twitch OAuth callback: exchanges code for tokens and stores them server-side
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
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

async function exchangeCode(code: string, redirectUri: string) {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET")!;

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("code", code);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", redirectUri);

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.message || "Falha ao trocar code por token");
  return json as TokenResponse;
}

async function twitchUsers(accessToken: string) {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID")!;
  const res = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.message || "Falha ao buscar usuário na Twitch");
  return json as { data: Array<{ id: string; login: string; display_name: string }> };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    if (error) {
      return html(
        `<!doctype html><html><body><h3>Erro Twitch</h3><p>${error}: ${errorDesc || ""}</p></body></html>`,
        400
      );
    }
    if (!code || !state) return html("Parâmetros inválidos", 400);

    const admin = getServiceClient();

    const { data: stateRow, error: sErr } = await admin
      .from("oauth_states")
      .select("user_id, redirect_to, expires_at")
      .eq("state", state)
      .eq("provider", "twitch")
      .maybeSingle();

    if (sErr || !stateRow) return html("State inválido/expirado", 400);
    if (new Date(stateRow.expires_at).getTime() < Date.now()) return html("State expirado", 400);

    // consume state
    await admin.from("oauth_states").delete().eq("state", state);

    const callbackUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/twitch-oauth-callback`;
    const tokens = await exchangeCode(code, callbackUrl);
    const userInfo = await twitchUsers(tokens.access_token);
    const me = userInfo.data?.[0];
    if (!me?.id || !me?.login) throw new Error("Não foi possível identificar usuário Twitch");

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upErr } = await admin.from("twitch_connections").upsert(
      {
        user_id: stateRow.user_id,
        twitch_user_id: me.id,
        twitch_login: me.login,
        twitch_display_name: me.display_name,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || "",
        scope: Array.isArray(tokens.scope) ? tokens.scope.join(" ") : null,
        token_type: tokens.token_type,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" }
    );
    if (upErr) throw upErr;

    // ensure live status row exists
    await admin.from("twitch_live_status").upsert(
      {
        user_id: stateRow.user_id,
        twitch_login: me.login,
        is_live: false,
      },
      { onConflict: "user_id" }
    );

    const redirectTo = stateRow.redirect_to || "/profile/edit";
    const safeRedirect = redirectTo.includes("?")
      ? `${redirectTo}&twitch=connected`
      : `${redirectTo}?twitch=connected`;

    return html(`<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta http-equiv="refresh" content="0;url=${safeRedirect}" /></head>
  <body>
    <p>Conectado! Redirecionando...</p>
    <script>window.location.replace(${JSON.stringify(safeRedirect)});</script>
  </body>
</html>`);
  } catch (e: any) {
    console.error(e);
    return html(`<!doctype html><html><body><h3>Erro</h3><pre>${e?.message || e}</pre></body></html>`, 500);
  }
});
