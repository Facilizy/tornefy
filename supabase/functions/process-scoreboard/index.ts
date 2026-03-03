import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PartidaJogador = {
  nick_normalizado: string;
  abates: number;
};

type PartidaRow = {
  posicao: number;
  tags_equipe: string[];
  jogadores: PartidaJogador[];
};

type PartidaOutput = {
  partida: PartidaRow[];
};

type TeamReg = {
  team_id: string;
  team_tag: string;
  team_name: string | null;
  line_id: string | null;
};

type PositionPoint = { position: number; points: number };

type SupportedGame = "free_fire" | "pubg_mobile" | "blood_strike";

type GameConfig = {
  id: SupportedGame;
  label: string;
  maxPrints: number;
  defaultTeamCount: number;
  playersPerTeam: number;
};

const GAME_CONFIGS: Record<SupportedGame, GameConfig> = {
  free_fire: {
    id: "free_fire",
    label: "Free Fire",
    maxPrints: 2,
    defaultTeamCount: 12,
    playersPerTeam: 4,
  },
  pubg_mobile: {
    id: "pubg_mobile",
    label: "PUBG Mobile",
    maxPrints: 4,
    defaultTeamCount: 19,
    playersPerTeam: 4,
  },
  blood_strike: {
    id: "blood_strike",
    label: "Blood Strike",
    maxPrints: 4,
    defaultTeamCount: 15,
    playersPerTeam: 4,
  },
};

function asSupportedGame(raw: unknown): SupportedGame {
  const g = String(raw ?? "").trim().toLowerCase();
  if (g === "free_fire" || g === "pubg_mobile" || g === "blood_strike") return g;
  return "free_fire";
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.floor(typeof n === "number" ? n : Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function buildSystemInstruction(args: {
  game: SupportedGame;
  teamCount: number;
  playersPerTeam: number;
  allowedTags: string[];
}): string {
  const { game, teamCount, playersPerTeam, allowedTags } = args;

  const common = `Você é um extrator de placar (print final) com regras rígidas.\n\nREGRAS GERAIS:\n1) Extração completa: para cada equipe (posições 1 a ${teamCount}), extraia obrigatoriamente ${playersPerTeam} jogadores.\n2) Tratamento de tags: use a TAG dominante do bloco como âncora para separar o nick.\n3) Normalização: gere nick_normalizado contendo apenas [A-Z0-9] (sem espaços, símbolos, acentos).\n4) Abates: use o número de abates/kills do jogador (inteiro >= 0).\n5) Saída: retorne ESTRITAMENTE JSON no formato:\n{\n  \\\"partida\\\": [\n    {\n      \\\"posicao\\\": 1,\n      \\\"tags_equipe\\\": [],\n      \\\"jogadores\\\": [ { \\\"nick_normalizado\\\": \\\"\\\", \\\"abates\\\": 0 } ]\n    }\n  ]\n}\n\nVALIDAÇÃO DE TAGS (times inscritos): ${allowedTags.join(", ")}\n\nIMPORTANTE: responda apenas com JSON (sem markdown e sem texto extra).`;

  if (game === "free_fire") {
    return `JOGO: Free Fire (FF).\nLayout típico: lista vertical dividida em blocos (ex: 1-5 e 6-11/12).\nMétrica principal: Abates.\nIdentificação: logotipo FREE FIRE no topo.\n\n${common}`;
  }

  if (game === "pubg_mobile") {
    return `JOGO: PUBG Mobile.\nLayout: escuro, fontes finas, ranking com números grandes à esquerda (#1, #2, #3...).\nMétrica principal: Kills ao lado do nick.\nIdentificação: logotipo PUBG MOBILE no topo e fundo preto sólido.\n\n${common}`;
  }

  // blood_strike
  return `JOGO: Blood Strike.\nLayout: horizontal, muito visual, com cards/avatares de 4 jogadores por equipe.\nIdentificação: título \"Resultados\" no topo.\nEquipe: a equipe é marcada por UMA LETRA grande (A, B, C, D, E, G, H, I, J...) à esquerda do ranking; use essa LETRA como TAG dominante em tags_equipe.\nMétrica: ícone de caveira indica abates (total e individual). Use o abate individual do card do jogador.\n\n${common}`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeTag(tag: string): string {
  return String(tag)
    .trim()
    .replace(/^\[|\]$/g, "")
    .replace(/^\(|\)$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normalizeNick(raw: string): string {
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

function safeNumber(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function extractFirstJsonObject(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("no_json_found");
  return JSON.parse(text.slice(start, end + 1));
}

function pickDominantTag(tags: string[]): string {
  // Prefer the first tag (model should already order). Fallback: longest.
  if (!Array.isArray(tags) || tags.length === 0) return "";
  const normalized = tags.map(normalizeTag).filter(Boolean);
  if (normalized.length === 0) return "";
  return normalized[0] ?? normalized.sort((a, b) => b.length - a.length)[0];
}

function groupTeamsByTag(teams: TeamReg[]) {
  const byTag = new Map<string, TeamReg[]>();
  for (const t of teams) {
    const tag = normalizeTag(t.team_tag);
    if (!tag) continue;
    const arr = byTag.get(tag) ?? [];
    arr.push(t);
    byTag.set(tag, arr);
  }
  // stable-ish ordering
  for (const [tag, arr] of byTag.entries()) {
    arr.sort((a, b) => String(a.team_name ?? "").localeCompare(String(b.team_name ?? "")) || a.team_id.localeCompare(b.team_id));
    byTag.set(tag, arr);
  }
  return byTag;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY");
      return jsonResponse({ error: "server_not_configured" }, 500);
    }
    if (!GEMINI_API_KEY) {
      console.error("Missing GOOGLE_GEMINI_API_KEY");
      return jsonResponse({ error: "gemini_not_configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client (for tables with deny-all RLS, e.g. training_round_tag_links)
    const adminDb = SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

    // Validate JWT in code (verify_jwt=false)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const body = await req.json();
    const trainingId = String(body?.training_id ?? "");
    const matchId = String(body?.match_id ?? "");

    // Backwards compat: accept {image_base64, mime_type} OR {image_base64s, mime_types}
    const imageBase64s: string[] = Array.isArray(body?.image_base64s)
      ? body.image_base64s.map((x: any) => String(x ?? "")).filter(Boolean)
      : [String(body?.image_base64 ?? "")].filter(Boolean);

    const mimeTypes: string[] = Array.isArray(body?.mime_types)
      ? body.mime_types.map((x: any) => String(x ?? "image/png"))
      : [String(body?.mime_type ?? "image/png")];

    const expectedTeamCount = body?.expected_team_count;
    const dryRun = body?.dry_run === true;

    if (!trainingId) return jsonResponse({ error: "missing_training_id" }, 400);
    if (!matchId) return jsonResponse({ error: "missing_match_id" }, 400);
    if (imageBase64s.length === 0) return jsonResponse({ error: "missing_image" }, 400);

    for (const mt of mimeTypes) {
      if (mt && !String(mt).startsWith("image/")) return jsonResponse({ error: "invalid_mime_type" }, 400);
    }

    // Ensure requester is organizer of this training
    const { data: training, error: trErr } = await supabase
      .from("trainings")
      .select("id, organizer_id, game, max_slots, points_per_kill, points_per_position")
      .eq("id", trainingId)
      .maybeSingle();
    if (trErr) return jsonResponse({ error: "training_lookup_failed" }, 500);
    if (!training) return jsonResponse({ error: "training_not_found" }, 404);
    if (String(training.organizer_id ?? "") !== String(userData.user.id)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const game = asSupportedGame((training as any)?.game);
    const gameCfg = GAME_CONFIGS[game];

    if (imageBase64s.length > gameCfg.maxPrints) {
      return jsonResponse({ error: "too_many_images", max: gameCfg.maxPrints }, 400);
    }

    const pointsPerKill = safeNumber((training as any)?.points_per_kill ?? 0, 0);
    const positionPointsArr: PositionPoint[] = Array.isArray((training as any)?.points_per_position)
      ? ((training as any).points_per_position as any[])
          .map((p: any) => ({ position: safeNumber(p?.position, 0), points: safeNumber(p?.points, 0) }))
          .filter((p: PositionPoint) => p.position > 0)
      : [];
    const positionPointsMap = new Map(positionPointsArr.map((p) => [p.position, p.points] as const));

    // Ensure match belongs to training
     const { data: match, error: mErr } = await supabase
       .from("training_matches")
       .select("id, training_id, round_id")
      .eq("id", matchId)
      .maybeSingle();
    if (mErr) return jsonResponse({ error: "match_lookup_failed" }, 500);
    if (!match) return jsonResponse({ error: "match_not_found" }, 404);
     if (String((match as any).training_id ?? "") !== trainingId) {
      return jsonResponse({ error: "match_not_in_training" }, 400);
    }

     const matchRoundId = String((match as any).round_id ?? "").trim();
     if (!matchRoundId) {
       return jsonResponse({ error: "match_missing_round" }, 400);
     }

    // Load registered teams (tags) for validation
    const { data: regs, error: regErr } = await supabase
      .from("training_registrations")
      .select(
        `
          team_id,
          line_id,
          teams ( id, tag, name )
        `
      )
      .eq("training_id", trainingId);
    if (regErr) return jsonResponse({ error: "registrations_lookup_failed" }, 500);

    const registeredTeams: TeamReg[] = (regs ?? [])
      .map((r: any) => ({
        team_id: String(r.team_id),
        team_tag: normalizeTag(r?.teams?.tag ?? ""),
        team_name: r?.teams?.name ?? null,
        line_id: r?.line_id ? String(r.line_id) : null,
      }))
      .filter((r: TeamReg) => r.team_id && r.team_tag);

    const allowedTags = registeredTeams.map((t) => t.team_tag).slice(0, 200);

    const trainingSlots = (training as any)?.max_slots;
    const teamCount = clampInt(
      expectedTeamCount ?? trainingSlots ?? gameCfg.defaultTeamCount,
      1,
      30,
    );

    const systemInstruction = buildSystemInstruction({
      game,
      teamCount,
      playersPerTeam: gameCfg.playersPerTeam,
      allowedTags,
    });

    const geminiModel = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

    const resolvedMimeTypes = imageBase64s.map((_, i) => String(mimeTypes[i] ?? mimeTypes[0] ?? "image/png"));

    const parts: any[] = [{ text: systemInstruction }];
    for (let i = 0; i < imageBase64s.length; i++) {
      parts.push({ inlineData: { mimeType: resolvedMimeTypes[i], data: imageBase64s[i] } });
    }

    const geminiResp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    const geminiRaw = await geminiResp.text();
    if (!geminiResp.ok) {
      console.error("Gemini error", geminiResp.status, geminiRaw);
      return jsonResponse({ error: "gemini_error", status: geminiResp.status }, 502);
    }

    let modelText = "";
    try {
      const parsed = JSON.parse(geminiRaw);
      modelText =
        parsed?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text)
          .filter(Boolean)
          .join("\n") ??
        "";
    } catch {
      modelText = geminiRaw;
    }

    let extracted: PartidaOutput;
    try {
      extracted = JSON.parse(modelText);
    } catch {
      extracted = extractFirstJsonObject(modelText);
    }

    const partida = Array.isArray(extracted?.partida) ? extracted.partida : [];

    // Post-process + enforce normalization rules
    const processed: PartidaRow[] = partida
      .map((row: any): PartidaRow => {
        const posicao = safeNumber(row?.posicao, 0);
        const tags_equipe = Array.isArray(row?.tags_equipe) ? row.tags_equipe.map((t: any) => normalizeTag(t)) : [];
        const jogadores = Array.isArray(row?.jogadores)
          ? row.jogadores.map((j: any) => ({
              nick_normalizado: normalizeNick(j?.nick_normalizado ?? j?.nick ?? ""),
              abates: Math.max(0, safeNumber(j?.abates, 0)),
            }))
          : [];

        return {
          posicao,
          tags_equipe,
          jogadores,
        };
      })
      .filter((r: PartidaRow) => r.posicao > 0);

    // Validate required range 1..teamCount (but don't hard-fail; return warnings)
    const warnings: string[] = [];
    for (let p = 1; p <= teamCount; p++) {
      if (!processed.some((r) => r.posicao === p)) warnings.push(`missing_position_${p}`);
    }

     // Build mapping: extracted row -> registered team
     // NOTE: TAGs podem se repetir (ex: múltiplos times com [WAR]).
     // Por isso, agrupamos por TAG e escolhemos um time ainda não usado na mesma queda.
     const teamsByTag = groupTeamsByTag(registeredTeams);
     const teamById = new Map(registeredTeams.map((t) => [t.team_id, t] as const));

     // Load tag links for this ROUND (tag -> team_id)
     const tagLinks = new Map<string, string>();
      try {
        if (!adminDb) {
          console.warn("SUPABASE_SERVICE_ROLE_KEY not set; skipping training_round_tag_links");
        } else {
          const { data: links, error: linkErr } = await adminDb
            .from("training_round_tag_links")
            .select("tag, team_id")
            .eq("round_id", matchRoundId);
          if (linkErr) {
            console.warn("training_round_tag_links lookup failed", linkErr);
          } else {
            for (const l of links ?? []) {
              const t = normalizeTag((l as any).tag ?? "");
              const tid = String((l as any).team_id ?? "").trim();
              if (t && tid) tagLinks.set(t, tid);
            }
          }
        }
      } catch (e) {
        console.warn("training_round_tag_links lookup failed", e);
      }

     const usedTeamIds = new Set<string>();

     const pickTeamForTag = (dominantTag: string): { team: TeamReg | null; resolution: "registered_tag" | "round_link" | "unmatched" } => {
       if (!dominantTag) return { team: null, resolution: "unmatched" };

       const linkedTeamId = tagLinks.get(dominantTag) ?? null;
       const linkedTeam = linkedTeamId ? teamById.get(linkedTeamId) ?? null : null;

       // 1) Preferência: vínculo por rodada (se existir) e ainda não usado
       if (linkedTeam && !usedTeamIds.has(linkedTeam.team_id)) {
         return { team: linkedTeam, resolution: "round_link" };
       }

       // 2) Caso o vínculo já tenha sido usado nesta queda, tente outro time com a mesma TAG
       const options = teamsByTag.get(dominantTag) ?? [];
       const next = options.find((t) => !usedTeamIds.has(t.team_id)) ?? null;
       if (next) return { team: next, resolution: "registered_tag" };

       // 3) Sem opções: marca como não resolvido
       return { team: null, resolution: "unmatched" };
     };

     const resolved = processed.map((r) => {
       const dominantTag = pickDominantTag(r.tags_equipe);
       const picked = pickTeamForTag(dominantTag);
       const team = picked.team;
       const resolution = picked.resolution;

       if (team) usedTeamIds.add(team.team_id);

      // enforce 4 players
      const jogadores = (r.jogadores ?? []).slice(0, 4);
      while (jogadores.length < 4) jogadores.push({ nick_normalizado: "", abates: 0 });

      return {
        posicao: r.posicao,
        dominant_tag: dominantTag,
         resolution,
         team: team ? { id: team.team_id, tag: team.team_tag, name: team.team_name, line_id: team.line_id } : null,
        jogadores,
      };
    });

    // Fetch members for all resolved teams
    const resolvedTeamIds = Array.from(
      new Set(resolved.map((r) => r.team?.id).filter(Boolean).map(String))
    );

    const membersByTeamId = new Map<string, any[]>();
    if (resolvedTeamIds.length > 0) {
      const { data: members, error: memErr } = await supabase
        .from("team_members")
        .select("id, team_id, user_id, player_name")
        .in("team_id", resolvedTeamIds);
      if (memErr) return jsonResponse({ error: "team_members_lookup_failed" }, 500);

      for (const m of members ?? []) {
        const tid = String((m as any).team_id);
        const arr = membersByTeamId.get(tid) ?? [];
        arr.push(m);
        membersByTeamId.set(tid, arr);
      }
    }

    // Build DB mutations (fallback rule: missing player -> only team score)
    const matchScoresToInsert: any[] = [];
    const playerStatsToInsert: any[] = [];
    const unresolvedPlayers: any[] = [];

    for (const row of resolved) {
        if (!row.team) {
          // TAG repetida + sem opção disponível costuma virar aqui.
          warnings.push(`unmatched_team_tag_${row.dominant_tag || "unknown"}`);
         continue;
       }

      const teamId = row.team.id;
      const teamMembers = membersByTeamId.get(teamId) ?? [];
      const memberByNick = new Map(
        teamMembers
          .filter((m: any) => (m?.player_name ?? "").length > 0)
          .map((m: any) => [normalizeNick(m.player_name), m] as const)
      );

      const resolvedPlayersForTeam: { team_member_id: string | null; user_id: string | null; player_name: string; kills: number }[] = [];

      for (const j of row.jogadores) {
        const nick = normalizeNick(j.nick_normalizado);
        const kills = Math.max(0, safeNumber(j.abates, 0));
        if (!nick) {
          unresolvedPlayers.push({ team_id: teamId, reason: "empty_nick", kills });
          continue;
        }

        const member = memberByNick.get(nick);
        if (!member || !member.user_id) {
          unresolvedPlayers.push({ team_id: teamId, nick_normalizado: nick, kills, reason: "player_not_found" });
          continue;
        }

        resolvedPlayersForTeam.push({
          team_member_id: String(member.id ?? ""),
          user_id: String(member.user_id ?? ""),
          player_name: String(member.player_name ?? nick),
          kills,
        });
      }

      const teamKillsFromResolvedPlayers = resolvedPlayersForTeam.reduce((sum, p) => sum + p.kills, 0);
      // Fallback requirement: do NOT assign unresolved player kills individually; keep them in team total only.
      // We conservatively use the sum of *all* extracted players as team kills.
      const teamKillsFromAllExtracted = (row.jogadores ?? []).reduce((sum, p) => sum + Math.max(0, safeNumber(p.abates, 0)), 0);
      const extraKills = Math.max(0, teamKillsFromAllExtracted - teamKillsFromResolvedPlayers);

      const killsTotal = teamKillsFromResolvedPlayers + extraKills;
      const positionPoints = positionPointsMap.get(row.posicao) ?? 0;
      const killPoints = killsTotal * pointsPerKill;
      const bonusPoints = 0;
      const totalPoints = positionPoints + killPoints + bonusPoints;

      matchScoresToInsert.push({
        match_id: matchId,
        team_id: teamId,
        position: row.posicao,
        kills: killsTotal,
        position_points: positionPoints,
        kill_points: killPoints,
        total_points: totalPoints,
        bonus_points: String(bonusPoints),
      });

      for (const p of resolvedPlayersForTeam) {
        playerStatsToInsert.push({
          match_id: matchId,
          team_id: teamId,
          line_id: row.team.line_id,
          team_member_id: p.team_member_id,
          player_name: p.player_name,
          kills: p.kills,
          is_mvp: false,
        });
      }
    }

    // Replace existing rows for this match (same behavior as UI save)
    if (!dryRun && matchScoresToInsert.length > 0) {
      const teamIds = Array.from(new Set(matchScoresToInsert.map((s) => String(s.team_id))));

      const delScores = await supabase
        .from("training_match_scores")
        .delete()
        .eq("match_id", matchId)
        .in("team_id", teamIds);
      if (delScores.error) return jsonResponse({ error: "delete_match_scores_failed" }, 500);

      const delPlayers = await (supabase as any)
        .from("training_player_stats")
        .delete()
        .eq("match_id", matchId)
        .in("team_id", teamIds);
      if (delPlayers.error) return jsonResponse({ error: "delete_player_stats_failed" }, 500);

      const insScores = await supabase.from("training_match_scores").insert(matchScoresToInsert);
      if (insScores.error) return jsonResponse({ error: "insert_match_scores_failed" }, 500);

      if (playerStatsToInsert.length > 0) {
        const insPlayers = await (supabase as any).from("training_player_stats").insert(playerStatsToInsert);
        if (insPlayers.error) return jsonResponse({ error: "insert_player_stats_failed" }, 500);
      }

      // Mark match completed
      await supabase.from("training_matches").update({ status: "completed" }).eq("id", matchId);
    }

    return jsonResponse({
      ok: true,
      dry_run: dryRun,
      warnings,
      extracted: { partida: processed },
      resolved,
      applied: {
        match_scores: dryRun ? 0 : matchScoresToInsert.length,
        player_stats: dryRun ? 0 : playerStatsToInsert.length,
        unresolved_players: unresolvedPlayers.length,
      },
      unresolved_players: unresolvedPlayers,
      preview_inserts: {
        match_scores: matchScoresToInsert,
        player_stats: playerStatsToInsert,
      },
    });
  } catch (e) {
    console.error("process-scoreboard error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
