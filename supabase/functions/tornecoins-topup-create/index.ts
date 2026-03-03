// supabase edge function: tornecoins-topup-create

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MIN_COINS = 5;
const TOPUP_PRICE_ID = "price_1SzHc0JqPOhjtWzyAFa3w9H0";

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
    if (!stripeKey || !supabaseUrl || !anonKey) {
      return Response.json(
        { error: "server_misconfigured" },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Defensive validation to avoid common misconfigurations.
    if (stripeKey.startsWith("pk_")) {
      return Response.json(
        { error: "invalid_stripe_key" },
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id || !userData.user.email) {
      return Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      coins_amount?: unknown;
      payment_method?: unknown;
    };
    const coins = Math.floor(Number(body?.coins_amount ?? 0));
    if (!Number.isFinite(coins) || coins < MIN_COINS) {
      return Response.json(
        { error: "invalid_amount" },
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const preferred = String(body?.payment_method ?? "auto").toLowerCase();
    const preferredMethod =
      preferred === "pix" || preferred === "boleto" || preferred === "card" ? preferred : "auto";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // best-effort: reuse customer by email
    const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
    const customerId = customers.data?.[0]?.id;

    const origin = req.headers.get("origin") ?? "";
    const successUrl = `${origin}/profile/edit?topup=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/profile/edit?topup=cancel`;

    // Prefer automatic payment methods (card, wallets, PIX/boleto if enabled in Stripe).
    // IMPORTANT: Don't force payment_method_types like "pix" because Stripe may reject it depending on account eligibility.
    // When enabled, Stripe Checkout will automatically show PIX/boleto/others.
    let session;

    const createAutomatic = () =>
      stripe.checkout.sessions.create({
        mode: "payment",
        automatic_payment_methods: { enabled: true },
        customer: customerId,
        customer_email: customerId ? undefined : userData.user.email,
        line_items: [{ price: TOPUP_PRICE_ID, quantity: coins }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          kind: "tornecoins_topup",
          user_id: userData.user.id,
          coins_amount: String(coins),
        },
      });

    const createForced = (method: "card" | "pix" | "boleto") =>
      stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: [method],
        customer: customerId,
        customer_email: customerId ? undefined : userData.user.email,
        line_items: [{ price: TOPUP_PRICE_ID, quantity: coins }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          kind: "tornecoins_topup",
          user_id: userData.user.id,
          coins_amount: String(coins),
          preferred_payment_method: method,
        },
      });

    try {
      if (preferredMethod !== "auto") {
        try {
          session = await createForced(preferredMethod as any);
        } catch (e: any) {
          const msg = String(e?.message || "");
          console.error("[tornecoins-topup-create] forced method failed", { method: preferredMethod, msg });
          session = await createAutomatic();
        }
      } else {
        session = await createAutomatic();
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      console.error("[tornecoins-topup-create] create session failed", msg);

      // Hard fallback to card-only to keep topup working even if automatic methods aren't available.
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer: customerId,
        customer_email: customerId ? undefined : userData.user.email,
        line_items: [{ price: TOPUP_PRICE_ID, quantity: coins }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          kind: "tornecoins_topup",
          user_id: userData.user.id,
          coins_amount: String(coins),
        },
      });
    }

    return Response.json(
      { url: session.url },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[tornecoins-topup-create]", e);
    return Response.json(
      { error: e?.message ? String(e.message) : "server_error" },
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
