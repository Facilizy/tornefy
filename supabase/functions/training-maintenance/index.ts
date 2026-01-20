import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TrainingRow = {
  id: string;
  datetime: string | null;
  max_slots: number | null;
  name: string | null;
  status: string | null;
};

type NotificationInsert = {
  id?: string | null;
  user_id?: string | null;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  related_id?: string | null;
  read?: boolean | null;
  created_at?: string | null;
};

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase env vars not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Optional lightweight auth for cron calls
    const authHeader = req.headers.get("authorization") || "";
    if (anonKey && authHeader && authHeader !== `Bearer ${anonKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const nowIso = now.toISOString();

    // Only process trainings around now (to reduce load)
    const lowerBound = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(); // -6h
    const upperBound = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(); // +6h

    const { data: trainings, error: trainingsError } = await supabase
      .from("trainings")
      .select("id, datetime, max_slots, name, status")
      .not("datetime", "is", null)
      .gte("datetime", lowerBound)
      .lte("datetime", upperBound);

    if (trainingsError) throw trainingsError;

    const processed: { training_id: string; actions: string[] }[] = [];

    for (const t of (trainings || []) as TrainingRow[]) {
      const actions: string[] = [];
      if (!t.datetime || !t.max_slots || t.max_slots <= 0) continue;

      const trainingTime = new Date(t.datetime);
      const checkinOpenAt = new Date(trainingTime.getTime() - 60 * 60 * 1000);
      const checkinCloseAt = new Date(trainingTime.getTime() - 10 * 60 * 1000);

      // Count current registrations
      const { count: regCount, error: regCountError } = await supabase
        .from("training_registrations")
        .select("id", { count: "exact", head: true })
        .eq("training_id", t.id);
      if (regCountError) throw regCountError;

      const isFull = (regCount || 0) >= (t.max_slots || 0);

      // Ensure slot_state row exists and detect transitions from full->not full
      const { data: slotStateRow, error: slotStateError } = await supabase
        .from("training_slot_state")
        .select("training_id, last_is_full")
        .eq("training_id", t.id)
        .maybeSingle();
      if (slotStateError) throw slotStateError;

      const prevWasFull = slotStateRow?.last_is_full ?? false;
      if (!slotStateRow) {
        await supabase.from("training_slot_state").upsert({
          training_id: t.id,
          last_is_full: isFull,
          updated_at: nowIso,
        });
      } else if (slotStateRow.last_is_full !== isFull) {
        await supabase
          .from("training_slot_state")
          .update({ last_is_full: isFull, updated_at: nowIso })
          .eq("training_id", t.id);
      }

      const notifyUsers = async (userIds: string[], payload: Omit<NotificationInsert, "user_id">) => {
        const rows: NotificationInsert[] = userIds.map((uid) => ({
          id: crypto.randomUUID(),
          user_id: uid,
          read: false,
          created_at: nowIso,
          ...payload,
        }));
        if (rows.length === 0) return;
        const { error } = await supabase.from("notifications").insert(rows);
        if (error) throw error;
      };

      const getTeamAdminUserIds = async (teamId: string) => {
        const userIds: string[] = [];

        const { data: team } = await supabase
          .from("teams")
          .select("owner_id")
          .eq("id", teamId)
          .maybeSingle();
        if (team?.owner_id) userIds.push(team.owner_id);

        const { data: invites } = await supabase
          .from("team_invites")
          .select("invited_user_id")
          .eq("team_id", teamId)
          .eq("status", "accepted")
          .eq("permission", "admin")
          .not("invited_user_id", "is", null);

        (invites || []).forEach((i: any) => {
          if (i.invited_user_id) userIds.push(i.invited_user_id);
        });

        return unique(userIds);
      };

      // 1) Check-in open notification (once per training)
      if (now >= checkinOpenAt && now <= checkinCloseAt) {
        const { data: alreadyNotified } = await supabase
          .from("training_notifications")
          .select("id")
          .eq("training_id", t.id)
          .eq("type", "checkin_open_notified")
          .maybeSingle();

        if (!alreadyNotified) {
          const { data: regs } = await supabase
            .from("training_registrations")
            .select("team_id")
            .eq("training_id", t.id);

          const allUserIds: string[] = [];
          for (const r of regs || []) {
            if (!r.team_id) continue;
            const ids = await getTeamAdminUserIds(r.team_id);
            allUserIds.push(...ids);
          }

          await notifyUsers(unique(allUserIds), {
            title: "Check-in aberto",
            message: `O check-in do treino "${t.name || "Treino"}" já está aberto. Confirme para garantir sua vaga.`,
            type: "checkin_open",
            related_id: t.id,
          });

          await supabase.from("training_notifications").insert({
            training_id: t.id,
            type: "checkin_open_notified",
            sent_at: nowIso,
          });

          actions.push("checkin_open_notified");
        }
      }

      // 2) Close window: remove teams without check-in (once per training)
      if (now >= checkinCloseAt && now <= new Date(trainingTime.getTime() + 30 * 60 * 1000)) {
        const { data: alreadyProcessed } = await supabase
          .from("training_notifications")
          .select("id")
          .eq("training_id", t.id)
          .eq("type", "checkin_closed_processed")
          .maybeSingle();

        if (!alreadyProcessed) {
          const { data: regs } = await supabase
            .from("training_registrations")
            .select("team_id")
            .eq("training_id", t.id);

          const { data: checkins } = await supabase
            .from("training_checkins")
            .select("team_id")
            .eq("training_id", t.id);

          const checkedTeamIds = new Set((checkins || []).map((c: any) => c.team_id).filter(Boolean));
          const regTeamIds = (regs || []).map((r: any) => r.team_id).filter(Boolean) as string[];
          const missing = regTeamIds.filter((teamId) => !checkedTeamIds.has(teamId));

          if (missing.length > 0) {
            // Delete registrations for missing teams
            const { error: delErr } = await supabase
              .from("training_registrations")
              .delete()
              .eq("training_id", t.id)
              .in("team_id", missing);
            if (delErr) throw delErr;

            // Notify removed teams
            for (const teamId of missing) {
              const ids = await getTeamAdminUserIds(teamId);
              await notifyUsers(ids, {
                title: "Removido por falta de check-in",
                message: `Sua equipe foi removida do treino "${t.name || "Treino"}" por não confirmar o check-in no prazo.`,
                type: "checkin_removed",
                related_id: t.id,
              });
            }

            actions.push(`removed_${missing.length}`);
          }

          // Notify remaining registered teams (if any removals happened)
          if (missing.length > 0) {
            const remainingTeams = regTeamIds.filter((teamId) => !missing.includes(teamId));
            const remainingUserIds: string[] = [];
            for (const teamId of remainingTeams) {
              const ids = await getTeamAdminUserIds(teamId);
              remainingUserIds.push(...ids);
            }
            await notifyUsers(unique(remainingUserIds), {
              title: "Atualização de vagas",
              message: `Algumas equipes foram removidas por falta de check-in no treino "${t.name || "Treino"}". Pode ter vaga disponível.`,
              type: "slot_update",
              related_id: t.id,
            });
          }

          // Notify waitlist that a slot may be open
          if (missing.length > 0) {
            const { data: w } = await supabase
              .from("training_waitlist")
              .select("team_id")
              .eq("training_id", t.id)
              .eq("status", "active");

            const waitUserIds: string[] = [];
            for (const row of w || []) {
              if (!row.team_id) continue;
              const ids = await getTeamAdminUserIds(row.team_id);
              waitUserIds.push(...ids);
            }

            await notifyUsers(unique(waitUserIds), {
              title: "Vaga disponível",
              message: `Abriu vaga no treino "${t.name || "Treino"}". Entre na página e clique para garantir (primeiro que clicar entra).`,
              type: "waitlist_slot_open",
              related_id: t.id,
            });
            actions.push("waitlist_notified_slot_open");
          }

          await supabase.from("training_notifications").insert({
            training_id: t.id,
            type: "checkin_closed_processed",
            sent_at: nowIso,
          });

          actions.push("checkin_closed_processed");
        }
      }

      // 3) If it just transitioned from full->not full, notify waitlist (once per transition)
      if (prevWasFull && !isFull) {
        const { data: alreadySlotNotified } = await supabase
          .from("training_notifications")
          .select("id")
          .eq("training_id", t.id)
          .eq("type", "slot_open_notified")
          .maybeSingle();

        if (!alreadySlotNotified) {
          const { data: w } = await supabase
            .from("training_waitlist")
            .select("team_id")
            .eq("training_id", t.id)
            .eq("status", "active");

          const waitUserIds: string[] = [];
          for (const row of w || []) {
            if (!row.team_id) continue;
            const ids = await getTeamAdminUserIds(row.team_id);
            waitUserIds.push(...ids);
          }

          await notifyUsers(unique(waitUserIds), {
            title: "Vaga disponível",
            message: `Abriu vaga no treino "${t.name || "Treino"}". Entre na página e clique para garantir (primeiro que clicar entra).`,
            type: "waitlist_slot_open",
            related_id: t.id,
          });

          await supabase.from("training_notifications").insert({
            training_id: t.id,
            type: "slot_open_notified",
            sent_at: nowIso,
          });

          actions.push("slot_open_notified");
        }
      }

      if (actions.length > 0) processed.push({ training_id: t.id, actions });
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("training-maintenance error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
