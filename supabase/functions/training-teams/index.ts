import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

function forbidden() {
  return json({ error: "forbidden" }, { status: 403 });
}

function serverError(message: string) {
  return json({ error: message }, { status: 500 });
}

type TeamGroup = {
  team_id: string;
  team_name: string;
  team_tag: string | null;
  members: Array<{
    user_id: string;
    display_name: string;
    email: string | null;
    has_verification: boolean;
    verified_at: string | null;
    hwid: string | null;
  }>;
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

    const body = (await req.json().catch(() => ({}))) as { trainingId?: string };
    const trainingId = String(body?.trainingId ?? "").trim();
    if (!trainingId) return badRequest("trainingId_required");

    const adminDb = createClient(supabaseUrl, serviceKey);

    // Only the organizer of the training can view this
    const { data: training, error: trainingErr } = await adminDb
      .from("trainings")
      .select("id,organizer_id")
      .eq("id", trainingId)
      .maybeSingle();
    if (trainingErr) return serverError(trainingErr.message);
    if (!training || String(training.organizer_id ?? "") !== uid) return forbidden();

    const [{ data: regs, error: regsErr }, { data: logs, error: logsErr }] = await Promise.all([
      adminDb
        .from("training_registrations")
        .select(
          `team_id, teams:teams ( id, name, tag )`
        )
        .eq("training_id", trainingId),
      adminDb
        .from("training_event_logs")
        .select("id,created_at,team_tag,team_name,action")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (regsErr) return serverError(regsErr.message);
    if (logsErr) return serverError(logsErr.message);

    const teamRows = (regs ?? [])
      .map((r: any) => ({
        team_id: String(r.team_id ?? r.teams?.id ?? ""),
        team_name: String(r.teams?.name ?? ""),
        team_tag: (r.teams?.tag ?? null) as string | null,
      }))
      .filter((t) => t.team_id);

    // Dedup teams
    const teamMap = new Map<string, { team_id: string; team_name: string; team_tag: string | null }>();
    for (const t of teamRows) teamMap.set(t.team_id, t);
    const teamIds = Array.from(teamMap.keys());

    const { data: members, error: membersErr } = await adminDb
      .from("team_members")
      .select("team_id,user_id")
      .in("team_id", teamIds.length ? teamIds : ["__none__"]);
    if (membersErr) return serverError(membersErr.message);

    const userIds = Array.from(
      new Set((members ?? []).map((m: any) => String(m.user_id ?? "")).filter(Boolean)),
    );

    const { data: profiles, error: profilesErr } = await adminDb
      .from("profiles")
      .select("id,full_name,username")
      .in("id", userIds.length ? userIds : ["__none__"]);
    if (profilesErr) return serverError(profilesErr.message);

    // Email lookup via Auth admin API (service role)
    const emailByUserId = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (id) => {
        try {
          const { data } = await adminDb.auth.admin.getUserById(id);
          emailByUserId.set(id, data?.user?.email ?? null);
        } catch {
          emailByUserId.set(id, null);
        }
      }),
    );

    // Anti-hack logs for this training (keyed by email)
    const { data: antiRows, error: antiErr } = await adminDb
      .from("anti_hack_events")
      .select("user_email,hwid,created_at")
      .eq("training_id", trainingId);
    if (antiErr) return serverError(antiErr.message);

    const antiByEmail = new Map<string, { hwid: string | null; created_at: string | null }>();
    for (const row of antiRows ?? []) {
      const email = String((row as any).user_email ?? "").trim().toLowerCase();
      if (!email) continue;
      const createdAt = (row as any).created_at as string | null;
      const prev = antiByEmail.get(email);
      if (!prev) {
        antiByEmail.set(email, { hwid: (row as any).hwid ?? null, created_at: createdAt ?? null });
        continue;
      }
      // keep the newest created_at
      if (createdAt && (!prev.created_at || createdAt > prev.created_at)) {
        antiByEmail.set(email, { hwid: (row as any).hwid ?? null, created_at: createdAt });
      }
    }

    const profileById = new Map<string, { display_name: string }>();
    for (const p of profiles ?? []) {
      const id = String((p as any).id ?? "");
      const display = String((p as any).full_name ?? (p as any).username ?? "Jogador").trim() || "Jogador";
      profileById.set(id, { display_name: display });
    }

    const membersByTeam = new Map<string, string[]>();
    for (const m of members ?? []) {
      const tId = String((m as any).team_id ?? "");
      const uId = String((m as any).user_id ?? "");
      if (!tId || !uId) continue;
      const list = membersByTeam.get(tId) ?? [];
      list.push(uId);
      membersByTeam.set(tId, list);
    }

    const teams: TeamGroup[] = teamIds
      .map((teamId) => {
        const t = teamMap.get(teamId)!;
        const teamMemberIds = Array.from(new Set(membersByTeam.get(teamId) ?? []));
        const membersOut = teamMemberIds.map((userId) => {
          const email = (emailByUserId.get(userId) ?? null)?.toLowerCase() ?? null;
          const anti = email ? antiByEmail.get(email) : undefined;
          return {
            user_id: userId,
            display_name: profileById.get(userId)?.display_name ?? "Jogador",
            email,
            has_verification: !!anti,
            verified_at: anti?.created_at ?? null,
            hwid: anti?.hwid ?? null,
          };
        });
        return {
          team_id: t.team_id,
          team_name: t.team_name,
          team_tag: t.team_tag,
          members: membersOut,
        };
      })
      .sort((a, b) => a.team_name.localeCompare(b.team_name));

    return json({ teams, eventLogs: logs ?? [] });
  } catch (e: any) {
    return serverError(e?.message || "unknown_error");
  }
});
