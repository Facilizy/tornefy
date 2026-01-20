import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { matchId, trainingId } = await req.json();

    if (!matchId && !trainingId) {
      return new Response(JSON.stringify({ error: "matchId ou trainingId são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase env vars not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ----------------------
    // Agregação de jogadores
    // ----------------------

    const { data: members, error: membersError } = await supabase
      .from("team_members")
      .select("id, user_id")
      .not("user_id", "is", null);

    if (membersError) throw membersError;

    const memberById = new Map<string, string>();
    (members || []).forEach((m: any) => {
      if (m.id && m.user_id) {
        memberById.set(m.id, m.user_id);
      }
    });

    let playerStatsQuery = supabase
      .from("training_player_stats")
      .select("team_member_id, kills, is_mvp, match_id");

    // Se quiser limitar por treinamento específico futuramente, podemos usar trainingId via join/sql.
    const { data: playerStats, error: playerStatsError } = await playerStatsQuery;
    if (playerStatsError) throw playerStatsError;

    type PlayerAgg = { kills: number; mvps: number; scrims: Set<string> };

    const perUserAgg = new Map<string, PlayerAgg>();

    (playerStats || []).forEach((row: any) => {
      const userId = row.team_member_id ? memberById.get(row.team_member_id) : null;
      if (!userId) return;

      if (!perUserAgg.has(userId)) {
        perUserAgg.set(userId, { kills: 0, mvps: 0, scrims: new Set<string>() });
      }

      const agg = perUserAgg.get(userId)!;
      agg.kills += row.kills ?? 0;
      if (row.is_mvp) agg.mvps += 1;
      if (row.match_id) agg.scrims.add(row.match_id as string);
    });

    // ------------------------
    // Agregação de organizador
    // ------------------------

    const { data: trainings, error: trainingsError } = await supabase
      .from("trainings")
      .select("id, organizer_id")
      .not("organizer_id", "is", null);

    if (trainingsError) throw trainingsError;

    const { data: matches, error: matchesError } = await supabase
      .from("training_matches")
      .select("id, training_id, status");

    if (matchesError) throw matchesError;

    const organizerByTrainingId = new Map<string, string>();
    (trainings || []).forEach((t: any) => {
      if (t.id && t.organizer_id) {
        organizerByTrainingId.set(t.id, t.organizer_id);
      }
    });

    type OrgAgg = { scrimsOrganized: number };
    const perOrganizerAgg = new Map<string, OrgAgg>();

    (matches || []).forEach((m: any) => {
      if (m.status !== "completed") return;
      const organizerId = m.training_id ? organizerByTrainingId.get(m.training_id) : null;
      if (!organizerId) return;

      if (!perOrganizerAgg.has(organizerId)) {
        perOrganizerAgg.set(organizerId, { scrimsOrganized: 0 });
      }

      const agg = perOrganizerAgg.get(organizerId)!;
      agg.scrimsOrganized += 1;
    });

    // ------------------------------
    // Carregar definições de trophies
    // ------------------------------

    const { data: achievements, error: achievementsError } = await supabase
      .from("achievements")
      .select("id, code, metric, target_value, name, description, audience");

    if (achievementsError) throw achievementsError;

    type AchievementDef = {
      id: string;
      code: string;
      metric: string;
      target_value: number;
      name: string;
      description: string | null;
      audience: string | null;
    };

    const byMetric = new Map<string, AchievementDef[]>();

    (achievements || []).forEach((a: any) => {
      const arr = byMetric.get(a.metric) || [];
      arr.push(a as AchievementDef);
      byMetric.set(a.metric, arr);
    });

    const rowsToUpsert: any[] = [];

    // -----------------
    // Jogadores: kills, MVPs, scrims
    // -----------------

    perUserAgg.forEach((agg, userId) => {
      const totalScrims = agg.scrims.size;

      const pushForMetric = (metric: string, value: number) => {
        const defs = byMetric.get(metric) || [];
        defs.forEach((def) => {
          const target = def.target_value || 1;
          const progress = value;
          const unlocked = progress >= target;

          const payload: any = {
            user_id: userId,
            achievement_id: def.id,
            progress,
          };

          if (unlocked) {
            payload.unlocked_at = new Date().toISOString();
          }

          rowsToUpsert.push(payload);
        });
      };

      pushForMetric("kills_total", agg.kills);
      pushForMetric("mvps_total", agg.mvps);
      pushForMetric("scrims_played", totalScrims);
    });

    // -----------------
    // Organizadores: scrims organizadas
    // -----------------

    perOrganizerAgg.forEach((agg, organizerId) => {
      const defs = byMetric.get("scrims_organized") || [];
      defs.forEach((def) => {
        const target = def.target_value || 1;
        const progress = agg.scrimsOrganized;
        const unlocked = progress >= target;

        const payload: any = {
          user_id: organizerId,
          achievement_id: def.id,
          progress,
        };

        if (unlocked) {
          payload.unlocked_at = new Date().toISOString();
        }

        rowsToUpsert.push(payload);
      });
    });

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("user_achievements")
        .upsert(rowsToUpsert, { onConflict: "user_id,achievement_id" });

      if (upsertError) throw upsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        playersUpdated: perUserAgg.size,
        organizersUpdated: perOrganizerAgg.size,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("update-achievements error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
