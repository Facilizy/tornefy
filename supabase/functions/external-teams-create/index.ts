import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function badRequest(message: string, extra?: unknown) {
  return json({ error: message, ...(extra ? { extra } : {}) }, { status: 400 });
}

function forbidden() {
  return json({ error: "forbidden" }, { status: 403 });
}

function serverError(message: string, extra?: unknown) {
  return json({ error: message, ...(extra ? { extra } : {}) }, { status: 500 });
}

type SlotInput = {
  slot: number;
  team_name?: string | null;
  team_tag?: string | null;
  jogadores: string[];
};

type DuplicateReport = {
  tags: Array<{ team_id: string; tag: string | null; name: string | null }>;
  names: Array<{ team_id: string; tag: string | null; name: string | null }>;
  players: Array<{ player_name: string; team_id: string; tag: string | null; name: string | null }>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return badRequest("method_not_allowed");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) return serverError("Supabase env vars not set");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return forbidden();

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData?.user) return forbidden();
    const uid = String(userData.user.id);

    const body = (await req.json().catch(() => ({}))) as {
      trainingId?: string;
      slots?: SlotInput[];
      confirm?: boolean;
    };

    const trainingId = String(body?.trainingId ?? "").trim();
    const slots = Array.isArray(body?.slots) ? body.slots : [];
    const confirm = Boolean((body as any)?.confirm);
    if (!trainingId) return badRequest("trainingId_required");
    if (!slots.length) return badRequest("slots_required");

    const adminDb = createClient(supabaseUrl, serviceKey);

    // Only the organizer can create external teams
    const { data: training, error: trainingErr } = await adminDb
      .from("trainings")
      .select("id,organizer_id")
      .eq("id", trainingId)
      .maybeSingle();
    if (trainingErr) return serverError(trainingErr.message);
    if (!training || String(training.organizer_id ?? "") !== uid) return forbidden();

    const normalizedSlots = slots
      .map((s) => ({
        slot: Number(s.slot),
        team_name: String(s.team_name ?? "").trim() || null,
        team_tag: String(s.team_tag ?? "").trim() || null,
        jogadores: Array.isArray(s.jogadores)
          ? s.jogadores.map((n) => String(n ?? "").trim()).filter(Boolean)
          : [],
      }))
      .filter((s) => Number.isFinite(s.slot) && s.slot >= 1 && s.slot <= 100);

    if (!normalizedSlots.length) return badRequest("slots_invalid");

    // Duplicate warnings (external teams only) — return 409 unless user confirmed.
    const tagsToCheck = Array.from(
      new Set(
        normalizedSlots
          .map((s) => (s.team_tag ? String(s.team_tag).toUpperCase().slice(0, 10) : ""))
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );
    const namesToCheck = Array.from(
      new Set(
        normalizedSlots
          .map((s) => (s.team_name ? String(s.team_name).trim() : ""))
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );
    const playersToCheck = Array.from(new Set(normalizedSlots.flatMap((s) => (s.jogadores ?? []).map((p) => p.trim()).filter(Boolean))));

    const duplicates: DuplicateReport = { tags: [], names: [], players: [] };

    if (tagsToCheck.length) {
      const { data: tagTeams, error: tagErr } = await adminDb
        .from("teams")
        .select("id,name,tag")
        .eq("is_external", true)
        .in("tag", tagsToCheck);
      if (tagErr) return serverError(tagErr.message);
      duplicates.tags = (tagTeams ?? []).map((t: any) => ({ team_id: String(t.id), tag: t.tag ?? null, name: t.name ?? null }));
    }

    if (namesToCheck.length) {
      const { data: nameTeams, error: nameErr } = await adminDb
        .from("teams")
        .select("id,name,tag")
        .eq("is_external", true)
        .in("name", namesToCheck);
      if (nameErr) return serverError(nameErr.message);
      duplicates.names = (nameTeams ?? []).map((t: any) => ({ team_id: String(t.id), tag: t.tag ?? null, name: t.name ?? null }));
    }

    if (playersToCheck.length) {
      const { data: memberRows, error: memberErr } = await adminDb
        .from("team_members")
        .select("player_name,team_id")
        .in("player_name", playersToCheck);
      if (memberErr) return serverError(memberErr.message);

      const teamIds = Array.from(new Set((memberRows ?? []).map((r: any) => String(r.team_id ?? "")).filter(Boolean)));
      if (teamIds.length) {
        const { data: teams, error: teamsErr } = await adminDb
          .from("teams")
          .select("id,name,tag,is_external")
          .in("id", teamIds)
          .eq("is_external", true);
        if (teamsErr) return serverError(teamsErr.message);
        const teamById = new Map((teams ?? []).map((t: any) => [String(t.id), t]));

        duplicates.players = (memberRows ?? [])
          .map((r: any) => {
            const tid = String(r.team_id ?? "");
            const t = teamById.get(tid);
            if (!t) return null;
            return {
              player_name: String(r.player_name ?? "").trim(),
              team_id: tid,
              tag: t.tag ?? null,
              name: t.name ?? null,
            };
          })
          .filter(Boolean) as any;
      }
    }

    const hasDup = Boolean(duplicates.tags.length || duplicates.names.length || duplicates.players.length);
    if (hasDup && !confirm) {
      return json({ error: "duplicates_detected", duplicates }, { status: 409 });
    }

    const slotNumbers = Array.from(new Set(normalizedSlots.map((s) => s.slot)));
    const { data: existingRegs, error: regsErr } = await adminDb
      .from("training_registrations")
      .select("id,slot_number,team_id")
      .eq("training_id", trainingId)
      .in("slot_number", slotNumbers);
    if (regsErr) return serverError(regsErr.message);

    const conflicts = (existingRegs ?? [])
      .filter((r: any) => r.slot_number != null)
      .map((r: any) => Number(r.slot_number));
    if (conflicts.length) {
      return badRequest("slot_conflict", { conflicts: Array.from(new Set(conflicts)).sort((a, b) => a - b) });
    }

    const created: Array<{ slot: number; team_id: string; team_name: string | null; team_tag: string | null }> = [];

    // Create sequentially to keep things simple and avoid partial weirdness.
    for (const s of normalizedSlots) {
      const defaultName = `SLOT ${s.slot}`;
      const defaultTag = `S${s.slot}`;

      const { data: team, error: teamErr } = await adminDb
        .from("teams")
        .insert({
          name: s.team_name ?? defaultName,
          tag: (s.team_tag ?? defaultTag).toUpperCase().slice(0, 10),
          owner_id: uid,
          is_external: true,
        })
        .select("id,name,tag")
        .single();
      if (teamErr) return serverError(teamErr.message);

      const membersRows = (s.jogadores ?? []).slice(0, 6).map((player_name) => ({
        team_id: team.id,
        player_name,
        game_id: null,
        discord: null,
        function: "RUSH",
      }));

      if (membersRows.length) {
        const { error: membersErr } = await adminDb.from("team_members").insert(membersRows);
        if (membersErr) return serverError(membersErr.message);
      }

      const { error: regErr } = await adminDb.from("training_registrations").insert({
        id: crypto.randomUUID(),
        training_id: trainingId,
        team_id: team.id,
        slot_number: s.slot,
      });
      if (regErr) return serverError(regErr.message);

      created.push({
        slot: s.slot,
        team_id: team.id,
        team_name: team.name,
        team_tag: team.tag,
      });
    }

    return json({ created });
  } catch (e: any) {
    return serverError(e?.message || "unknown_error");
  }
});
