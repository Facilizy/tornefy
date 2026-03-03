// supabase edge function: tornecoins-topup-verify

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return Response.json(
        { error: "method_not_allowed" },
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!stripeKey || !supabaseUrl || !anonKey || !serviceKey) {
      return Response.json(
        { error: "server_misconfigured" },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { session_id?: unknown };
    const sessionId = String(body?.session_id ?? "").trim();
    if (!sessionId) {
      return Response.json(
        { error: "missing_session_id" },
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return Response.json(
        { ok: false, error: "not_paid" },
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate ownership
    const metaUserId = String((session.metadata as any)?.user_id ?? "");
    if (!metaUserId || metaUserId !== userData.user.id) {
      return Response.json(
        { error: "forbidden" },
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Determine coins amount via metadata first (set by create). Fallback to line items quantity.
    let coins = Math.floor(Number((session.metadata as any)?.coins_amount ?? 0));
    if (!Number.isFinite(coins) || coins <= 0) {
      const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
      const qty = Number(items.data?.[0]?.quantity ?? 0);
      coins = Math.floor(qty);
    }

    if (!Number.isFinite(coins) || coins <= 0) {
      return Response.json(
        { error: "invalid_amount" },
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminDb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Idempotency: store stripe_session_id unique
    const { error: insErr } = await adminDb.from("tornecoin_stripe_topups").insert({
      stripe_session_id: sessionId,
      user_id: userData.user.id,
      amount_coins: coins,
      currency: String(session.currency ?? "brl").toUpperCase(),
    } as any);

    if (insErr) {
      // Unique violation -> already credited
      if (String((insErr as any).code) === "23505") {
        return Response.json(
          { ok: true, already_credited: true, amount_coins: coins },
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("[tornecoins-topup-verify] insert error", insErr);
      return Response.json(
        { error: "failed_to_record_topup" },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: creditTxId, error: creditErr } = await adminDb.rpc("tornecoin_credit_user", {
      _user_id: userData.user.id,
      _amount: coins,
      _reference_type: "stripe_topup",
      _reference_id: sessionId,
      _meta: {
        stripe_session_id: sessionId,
        stripe_payment_intent: session.payment_intent,
        currency: session.currency,
        amount_total: session.amount_total,
      },
    });

    if (creditErr) {
      console.error("[tornecoins-topup-verify] credit error", creditErr);
      return Response.json(
        { error: "failed_to_credit" },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return Response.json(
      { ok: true, already_credited: false, amount_coins: coins, tx_id: creditTxId },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[tornecoins-topup-verify]", e);
    return Response.json(
      { error: e?.message ? String(e.message) : "server_error" },
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
