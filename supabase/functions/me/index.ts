// supabase edge function: me
// Returns authenticated user's basic info + roles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return Response.json(
        { error: "method_not_allowed" },
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[me] Missing env vars", {
        hasUrl: !!SUPABASE_URL,
        hasAnon: !!SUPABASE_ANON_KEY,
        hasService: !!SUPABASE_SERVICE_ROLE_KEY,
      });
      return Response.json(
        { error: "server_misconfigured" },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    // Client bound to the user's JWT so we can validate claims
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims();
    if (claimsErr) {
      console.warn("[me] getClaims error", claimsErr);
      return Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const uid = claimsData?.claims?.sub;
    const email = (claimsData as any)?.claims?.email ?? null;
    if (!uid) {
      return Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin client (service role) for reading user_roles reliably
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: rolesRows, error: rolesErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);

    if (rolesErr) {
      console.error("[me] roles query error", rolesErr);
      return Response.json(
        { error: "failed_to_load_roles" },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const roles = (rolesRows ?? [])
      .map((r) => r.role)
      .filter((r): r is string => typeof r === "string" && r.length > 0);

    return Response.json(
      {
        ok: true,
        user_id: uid,
        email,
        roles,
      },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[me] Unhandled", e);
    return Response.json(
      { error: "server_error" },
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
