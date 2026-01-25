import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import type { Match, MatchScore, PlayerStat, PositionPoint, Round, Team } from "./score-management/types";
import { ScoreRoundsSection } from "./score-management/ScoreRoundsSection";
import { ScoreMatchesSection } from "./score-management/ScoreMatchesSection";
import { ScoreEntrySection } from "./score-management/ScoreEntrySection";

interface ScoreManagementDialogProps {
  trainingId: string;
  teams: Team[];
  pointsPerKill: number;
  pointsPerPosition: PositionPoint[];
  onScoresUpdated: () => void;
}

export function ScoreManagementDialog({
  trainingId,
  teams,
  pointsPerKill,
  pointsPerPosition,
  onScoresUpdated,
}: ScoreManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [playerStatsByTeam, setPlayerStatsByTeam] = useState<Record<string, PlayerStat[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<
    | null
    | {
        title: string;
        message: string;
        action?: string;
      }
  >(null);

  // New round/match form
  const [newRoundName, setNewRoundName] = useState("");
  const [newMatchName, setNewMatchName] = useState("");
  const [newMatchMap, setNewMatchMap] = useState("");

  const defaultRoundId = rounds[0]?.id || "";
  const effectiveRoundId = selectedRound || defaultRoundId;
  const canCreateMatch = !!effectiveRoundId;

  // Prevent out-of-order fetches from overwriting newer state
  const roundsFetchIdRef = useRef(0);
  const matchesFetchIdRef = useRef(0);

  const positionPointsMap = useMemo(() => {
    const map: Record<number, number> = {};
    if (Array.isArray(pointsPerPosition)) {
      pointsPerPosition.forEach((pp: PositionPoint) => {
        map[pp.position] = pp.points;
      });
    }
    return map;
  }, [pointsPerPosition]);

  useEffect(() => {
    if (open) {
      setModalError(null);
      fetchRounds();
    }
  }, [open, trainingId]);

  const reportError = (
    title: string,
    error: any,
    fallbackMessage: string,
    action?: string
  ) => {
    const message =
      (error && (error.message || error.error_description)) ||
      (typeof error === "string" ? error : null) ||
      fallbackMessage;

    // Detect common permission/RLS failures
    const msgLower = String(message).toLowerCase();
    const isPermission =
      msgLower.includes("row level security") ||
      msgLower.includes("rls") ||
      msgLower.includes("permission") ||
      msgLower.includes("not allowed") ||
      msgLower.includes("42501");

    setModalError({
      title,
      message: String(message),
      action:
        action ||
        (isPermission
          ? "Isso geralmente é permissão (RLS). Confirme se você está logado como ORGANIZADOR e se sua conta tem acesso a este treino."
          : undefined),
    });

    toast.error(title);
    console.error(title, error);
  };

  // Auto-select first round when dialog opens (but allow user to change it)
  useEffect(() => {
    if (!open) return;
    if (rounds.length === 0) return;
    const hasSelected = !!selectedRound && rounds.some((r) => r.id === selectedRound);
    if (!hasSelected) setSelectedRound(rounds[0].id);
  }, [open, rounds, selectedRound]);

  useEffect(() => {
    if (!open) return;
    if (!effectiveRoundId) return;
    void fetchMatches(effectiveRoundId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, effectiveRoundId]);

  useEffect(() => {
    if (selectedMatch) {
      fetchScores(selectedMatch);
    }
  }, [selectedMatch]);

  const fetchRounds = async () => {
    const fetchId = ++roundsFetchIdRef.current;
    setLoading(true);
    const { data, error } = await supabase
      .from("training_rounds")
      .select("*")
      .eq("training_id", trainingId)
      .order("round_number");

    if (error) {
      reportError("Não foi possível carregar as rodadas", error, "Erro ao carregar rodadas");
      setLoading(false);
      return;
    }

    if (fetchId !== roundsFetchIdRef.current) {
      setLoading(false);
      return;
    }

    if (!error && data) {
      const invalid = data.filter((r: any) => !r.id);
      const valid = data.filter((r: any) => !!r.id);

      if (invalid.length > 0) {
        setModalError({
          title: "Rodadas inválidas no banco",
          message:
            "Seu banco retornou rodadas com id = null. Enquanto isso existir, selecionar/excluir/criar quedas não funciona.",
          action:
            "Rode o SQL de correção de IDs (que te enviei) e recarregue a página. Se precisar, eu te mando a versão completa incluindo training_matches.",
        });
      }

      setRounds(valid);

      if (valid.length === 0) {
        setSelectedRound("");
        setSelectedMatch("");
        setMatches([]);
        setScores([]);
        setPlayerStatsByTeam({});
      } else {
        setSelectedRound((prev) => (valid.some((r: any) => r.id === prev) ? prev : valid[0].id));
      }
    }
    setLoading(false);
  };

  const fetchMatches = async (roundId: string) => {
    const fetchId = ++matchesFetchIdRef.current;
    const { data, error } = await supabase
      .from("training_matches")
      .select("*")
      .eq("round_id", roundId)
      .order("match_number");

    if (error) {
      reportError("Não foi possível carregar as quedas", error, "Erro ao carregar quedas");
      return;
    }

    if (fetchId !== matchesFetchIdRef.current) return;

    if (data) {
      setMatches(data);
      if (data.length === 0) {
        setSelectedMatch("");
        setScores([]);
        setPlayerStatsByTeam({});
      } else {
        setSelectedMatch((prev) => (data.some((m) => m.id === prev) ? prev : data[0].id));
      }
    }
  };

  const loadPlayersForTeam = async (teamId: string, matchId: string) => {
    try {
      const { data: registration } = await (supabase as any)
        .from("training_registrations")
        .select("line_id")
        .eq("training_id", trainingId)
        .eq("team_id", teamId)
        .maybeSingle();

      const lineId = registration?.line_id ?? null;

      // Importante:
      // - mostrar somente jogadores com conta (user_id != null)
      // - manter compatibilidade com membros legacy (line_id = null)
      let membersQuery = (supabase as any)
        .from("team_members")
        .select("id, player_name, line_id, team_id, user_id")
        .eq("team_id", teamId)
        .not("user_id", "is", null);

      // If the team is registered with a specific line, include that line AND unassigned members
      // so the organizer can still score them.
      if (lineId) {
        membersQuery = membersQuery.or(`line_id.eq.${lineId},line_id.is.null`);
      } else {
        membersQuery = membersQuery.is("line_id", null);
      }

      const { data: members } = await membersQuery;

      const { data: existingStats } = await (supabase as any)
        .from("training_player_stats")
        .select("*")
        .eq("match_id", matchId)
        .eq("team_id", teamId);

      const statsByMemberId: Record<string, { kills: number; is_mvp: boolean }> = {};

      (existingStats || []).forEach((s: any) => {
        if (s?.team_member_id) {
          statsByMemberId[String(s.team_member_id)] = {
            kills: Number(s.kills ?? 0),
            is_mvp: !!s.is_mvp,
          };
        }
      });

      const memberStats: PlayerStat[] = (members || []).map((m: any) => {
        const existing = statsByMemberId[m.id] || { kills: 0, is_mvp: false };
        return {
          client_id: String(m.id),
          team_id: teamId,
          line_id: m.line_id,
          team_member_id: String(m.id),
          user_id: m.user_id ?? null,
          player_name: m.player_name || "Jogador",
          kills: existing.kills,
          is_mvp: existing.is_mvp,
        };
      });

      const playerStats: PlayerStat[] = memberStats;

      setPlayerStatsByTeam((prev) => ({
        ...prev,
        [teamId]: playerStats,
      }));

      const playersKills = playerStats.reduce((sum, p) => sum + (Number(p.kills) || 0), 0);
      setScores((prev) =>
        prev.map((s) => {
          if (s.team_id !== teamId) return s;
          const totalFromDb = Number(s.kills ?? 0) || 0;
          const inferredExtra = Math.max(0, totalFromDb - playersKills);
          return {
            ...s,
            extra_kills: inferredExtra,
            kills: playersKills + inferredExtra,
          };
        })
      );
    } catch (error) {
      console.error("Erro ao carregar jogadores da line:", error);
    }
  };

  const fetchScores = async (matchId: string) => {
    const { data, error } = await supabase
      .from("training_match_scores")
      .select("*")
      .eq("match_id", matchId);

    if (error) {
      reportError("Não foi possível carregar as pontuações", error, "Erro ao carregar pontuações");
      setScores([]);
      setPlayerStatsByTeam({});
      return;
    }

    if (data) {
      const loadedScores = data.map((s) => ({
        team_id: s.team_id,
        position: s.position,
        kills: Number(s.kills ?? 0) || 0,
        extra_kills: 0,
        bonus_points: Number((s as any).bonus_points ?? 0),
      }));
      setScores(loadedScores);

      await Promise.all(
        loadedScores.map((s) => loadPlayersForTeam(s.team_id, matchId))
      );
    } else {
      setScores([]);
      setPlayerStatsByTeam({});
    }
  };

  const createRound = async () => {
    if (!newRoundName.trim()) {
      toast.error("Digite o nome da rodada");
      return;
    }

    const nextRoundNumber =
      rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_number || 0)) + 1 : 1;

    const { data, error } = await supabase
      .from("training_rounds")
      .insert({
        training_id: trainingId,
        name: newRoundName,
        round_number: nextRoundNumber,
      })
      .select()
      .single();

    if (error) {
      reportError("Não foi possível criar a rodada", error, "Erro ao criar rodada");
      return;
    }

    toast.success("Rodada criada!");
    setNewRoundName("");
    fetchRounds();
    if (data) setSelectedRound(data.id);
  };

  const createMatch = async () => {
    if (!effectiveRoundId) {
      toast.error("Selecione uma rodada primeiro");
      return;
    }
    if (!newMatchName.trim()) {
      toast.error("Digite o nome da queda");
      return;
    }

    const nextMatchNumber =
      matches.length > 0 ? Math.max(...matches.map((m) => m.match_number || 0)) + 1 : 1;

    const { data, error } = await supabase
      .from("training_matches")
      .insert({
        round_id: effectiveRoundId,
        training_id: trainingId,
        name: newMatchName,
        match_number: nextMatchNumber,
        map_name: newMatchMap || null,
      })
      .select()
      .single();

    if (error) {
      reportError("Não foi possível criar a queda", error, "Erro ao criar queda");
      return;
    }

    toast.success("Queda criada!");
    setNewMatchName("");
    setNewMatchMap("");
    void fetchMatches(effectiveRoundId);
    if (data) setSelectedMatch(data.id);
  };

  const deleteRound = async (roundId: string) => {
    if (!roundId) {
      reportError(
        "Não foi possível excluir a rodada",
        "id inválido (null)",
        "Rodada sem id válido"
      );
      return;
    }
    // Optimistic UI (immediate removal)
    setRounds((prev) => prev.filter((r) => r.id !== roundId));
    if (selectedRound === roundId) {
      const fallback = rounds.find((r) => r.id !== roundId)?.id || "";
      setSelectedRound(fallback);
      setSelectedMatch("");
      setMatches([]);
      setScores([]);
      setPlayerStatsByTeam({});
    }

    // Cascade delete: match_scores + player_stats + matches + round
    try {
      const { data: matchIds, error: matchIdsError } = await supabase
        .from("training_matches")
        .select("id")
        .eq("round_id", roundId);
      if (matchIdsError) throw matchIdsError;

      const ids = (matchIds || []).map((m: any) => m.id);
      if (ids.length > 0) {
        const { error: scoreDelErr } = await supabase
          .from("training_match_scores")
          .delete()
          .in("match_id", ids);
        if (scoreDelErr) throw scoreDelErr;

        const { error: playerDelErr } = await (supabase as any)
          .from("training_player_stats")
          .delete()
          .in("match_id", ids);
        if (playerDelErr) throw playerDelErr;

        const { error: matchesDelErr } = await supabase
          .from("training_matches")
          .delete()
          .in("id", ids);
        if (matchesDelErr) throw matchesDelErr;
      }

      const { error: roundDelErr } = await supabase
        .from("training_rounds")
        .delete()
        .eq("id", roundId);
      if (roundDelErr) throw roundDelErr;

      toast.success("Rodada excluída!");
      void fetchRounds();
    } catch (error) {
      reportError("Não foi possível excluir a rodada", error, "Erro ao excluir rodada");
      // Resync to recover UI if optimistic removal was wrong
      void fetchRounds();
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!matchId) {
      reportError(
        "Não foi possível excluir a queda",
        "id inválido (null)",
        "Queda sem id válido"
      );
      return;
    }
    // Optimistic UI
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    if (selectedMatch === matchId) {
      setSelectedMatch("");
      setScores([]);
      setPlayerStatsByTeam({});
    }

    try {
      const { error: scoreDelErr } = await supabase
        .from("training_match_scores")
        .delete()
        .eq("match_id", matchId);
      if (scoreDelErr) throw scoreDelErr;

      const { error: playerDelErr } = await (supabase as any)
        .from("training_player_stats")
        .delete()
        .eq("match_id", matchId);
      if (playerDelErr) throw playerDelErr;

      const { error: matchDelErr } = await supabase
        .from("training_matches")
        .delete()
        .eq("id", matchId);
      if (matchDelErr) throw matchDelErr;

      toast.success("Queda excluída!");
      if (effectiveRoundId) void fetchMatches(effectiveRoundId);
    } catch (error) {
      reportError("Não foi possível excluir a queda", error, "Erro ao excluir queda");
      if (effectiveRoundId) void fetchMatches(effectiveRoundId);
    }
  };

  const addTeamScore = (teamId: string) => {
    if (scores.find(s => s.team_id === teamId)) {
      toast.error("Equipe já adicionada nesta queda");
      return;
    }

    if (!selectedMatch) {
      toast.error("Selecione uma queda primeiro");
      return;
    }

    // Find next available position
    const usedPositions = scores.map(s => s.position);
    let nextPosition = 1;
    while (usedPositions.includes(nextPosition)) {
      nextPosition++;
    }

    setScores([...scores, { team_id: teamId, position: nextPosition, kills: 0, extra_kills: 0, bonus_points: 0 }]);
    // Load players for this team so team kills can be auto-summed from player kills
    void loadPlayersForTeam(teamId, selectedMatch);
  };

  const updateTeamPosition = (teamId: string, newPosition: number) => {
    // Check if position is already used by another team
    const existingTeam = scores.find(s => s.position === newPosition && s.team_id !== teamId);
    if (existingTeam) {
      toast.error("Esta posição já está ocupada por outra equipe");
      return;
    }

    setScores(scores.map(s => 
      s.team_id === teamId ? { ...s, position: newPosition } : s
    ));
  };

  const updateTeamKills = (teamId: string, kills: number) => {
    setScores(scores.map((s) =>
      s.team_id === teamId ? { ...s, kills } : s
    ));
  };

  const removeTeamScore = (teamId: string) => {
    setScores(scores.filter((s) => s.team_id !== teamId));
    setPlayerStatsByTeam((prev) => {
      const clone = { ...prev };
      delete clone[teamId];
      return clone;
    });
  };

  const updateTeamBonusPoints = (teamId: string, bonus: number) => {
    setScores(scores.map((s) =>
      s.team_id === teamId ? { ...s, bonus_points: bonus } : s
    ));
  };

  const calculatePoints = (position: number, kills: number, bonusPoints: number = 0) => {
    const posPoints = positionPointsMap[position] || 0;
    const killPoints = kills * pointsPerKill;
    return { posPoints, killPoints, bonusPoints, total: posPoints + killPoints + bonusPoints };
  };

  const updatePlayerKills = (teamId: string, playerClientId: string, kills: number) => {
    setPlayerStatsByTeam((prev) => {
      const teamPlayers = prev[teamId] || [];
      const updated = teamPlayers.map((p) =>
        p.client_id === playerClientId ? { ...p, kills } : p
      );

      const playersKills = updated.reduce((sum, p) => sum + (Number(p.kills) || 0), 0);
      setScores((currentScores) =>
        currentScores.map((s) =>
          s.team_id === teamId
            ? { ...s, kills: playersKills + (Number(s.extra_kills ?? 0) || 0) }
            : s
        )
      );

      return {
        ...prev,
        [teamId]: updated,
      };
    });
  };

  const toggleMvp = (teamId: string, playerClientId: string) => {
    setPlayerStatsByTeam((prev) => {
      const teamPlayers = prev[teamId] || [];
      const target = teamPlayers.find((p) => p.client_id === playerClientId);
      // MVP só para jogadores com conta (user_id)
      if (!target?.user_id) return prev;

      const updated = teamPlayers.map((p) => ({
        ...p,
        is_mvp: p.client_id === playerClientId,
      }));

      return {
        ...prev,
        [teamId]: updated,
      };
    });
  };

  const saveScores = async () => {
    if (!selectedMatch) {
      toast.error("Selecione uma queda");
      return;
    }

    // Validations
    if (scores.length === 0) {
      toast.error("Adicione pelo menos 1 equipe antes de salvar");
      return;
    }

    const positions = scores.map((s) => s.position);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      toast.error("Existem posições duplicadas. Ajuste 1º/2º/3º... antes de salvar");
      return;
    }

    const hasInvalid = scores.some(
      (s) => !Number.isFinite(s.position) || s.position <= 0 || !Number.isFinite(s.kills) || s.kills < 0
    );
    if (hasInvalid) {
      toast.error("Preencha posição e kills corretamente (sem valores negativos)");
      return;
    }

    setSaving(true);

    try {
      const scoresToPersist = scores;

      // Delete existing scores and player stats for this match
      await supabase
        .from("training_match_scores")
        .delete()
        .eq("match_id", selectedMatch);

      await (supabase as any)
        .from("training_player_stats")
        .delete()
        .eq("match_id", selectedMatch);

      // Insert new scores
      const scoresToInsert = scoresToPersist.map((s) => {
        const pts = calculatePoints(s.position, s.kills, s.bonus_points);
        return {
          match_id: selectedMatch,
          team_id: s.team_id,
          position: s.position,
          kills: s.kills,
          position_points: pts.posPoints,
          kill_points: pts.killPoints,
          // DB column is text; we keep it numeric in UI and serialize on write
          bonus_points: String(Number(s.bonus_points ?? 0)),
          total_points: pts.total,
        };
      });

      if (scoresToInsert.length > 0) {
        const { error } = await supabase
          .from("training_match_scores")
          .insert(scoresToInsert);

        if (error) throw error;
      }

      // Insert player stats
      const playerStatsToInsert = Object.entries(playerStatsByTeam).flatMap(
        ([teamId, players]) =>
          players
            .filter((p) => p.kills > 0 || p.is_mvp)
            .map((p) => ({
              match_id: selectedMatch,
              team_id: teamId,
              line_id: p.line_id,
              team_member_id: p.team_member_id,
              player_name: p.player_name,
              kills: p.kills,
              // MVP só vale para jogador com conta
              is_mvp: p.user_id ? p.is_mvp : false,
            }))
      );

      if (playerStatsToInsert.length > 0) {
        const { error } = await (supabase as any)
          .from("training_player_stats")
          .insert(playerStatsToInsert);

        if (error) throw error;
      }

      // Update match status
      await supabase
        .from("training_matches")
        .update({ status: "completed" })
        .eq("id", selectedMatch);

      // Dispara atualização de conquistas (jogadores + organizador)
      try {
        await supabase.functions.invoke("update-achievements", {
          body: {
            matchId: selectedMatch,
            trainingId,
          },
        });
      } catch (invokeError) {
        console.error("Erro ao chamar update-achievements:", invokeError);
      }

      // Auditoria: salva logs no training_event_logs (organizador)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const savedBy = sessionData.session?.user?.id || null;

        const teamMap = new Map(teams.map((t) => [t.id, t] as const));
        const auditRows = scoresToPersist.map((s) => {
          const team = teamMap.get(s.team_id);
          const players = playerStatsByTeam[s.team_id] || [];
          const playersKills = players.reduce((sum, p) => sum + (Number(p.kills) || 0), 0);
          const extraKills = Number(s.extra_kills ?? 0) || 0;

          return {
            training_id: trainingId,
            team_id: s.team_id,
            team_name: team?.name ?? null,
            team_tag: team?.tag ?? null,
            action: JSON.stringify({
              type: "score_saved",
              match_id: selectedMatch,
              saved_by: savedBy,
              position: s.position,
              kills_players: playersKills,
              kills_extra: extraKills,
              kills_total: playersKills + extraKills,
              bonus_points: Number(s.bonus_points ?? 0),
              mvp_member_id: (players.find((p) => p.is_mvp)?.team_member_id ?? null),
            }),
          };
        });

        if (auditRows.length) {
          await (supabase as any).from("training_event_logs").insert(auditRows);
        }
      } catch (logErr) {
        console.error("Falha ao gravar auditoria no event logs:", logErr);
      }

      toast.success("Pontuação salva com sucesso!");
      onScoresUpdated();
    } catch (error) {
      console.error("Erro ao salvar pontuação:", error);
      toast.error("Erro ao salvar pontuação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-center gap-2">
          <Trophy className="w-4 h-4" />
          Gerenciar Pontuação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-4xl h-[90vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Sistema de Pontuação
          </DialogTitle>
        </DialogHeader>

        {modalError && (
          <div className="mb-3">
            <Alert>
              <AlertTitle>{modalError.title}</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm">{modalError.message}</p>
                  {modalError.action && (
                    <p className="text-sm text-muted-foreground">{modalError.action}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <ScrollArea className="h-[calc(90vh-7rem)] pr-3">
          <div className="space-y-6">
            <ScoreRoundsSection
              rounds={rounds}
              selectedRoundId={effectiveRoundId}
              newRoundName={newRoundName}
              onNewRoundNameChange={setNewRoundName}
              onCreateRound={createRound}
              onSelectRound={(id) => {
                setSelectedRound(id);
                setSelectedMatch("");
                setMatches([]);
                setScores([]);
                setPlayerStatsByTeam({});
              }}
              onDeleteRound={deleteRound}
            />

            <Separator />

            <ScoreMatchesSection
              canCreateMatch={canCreateMatch}
              newMatchName={newMatchName}
              newMatchMap={newMatchMap}
              onNewMatchNameChange={setNewMatchName}
              onNewMatchMapChange={setNewMatchMap}
              onCreateMatch={createMatch}
              matches={matches}
              selectedMatchId={selectedMatch}
              onSelectMatch={(id) => {
                setSelectedMatch(id);
                setScores([]);
                setPlayerStatsByTeam({});
              }}
              onDeleteMatch={deleteMatch}
            />

            <Separator />

            <ScoreEntrySection
              teams={teams}
              selectedMatchId={selectedMatch}
              pointsPerKill={pointsPerKill}
              positionPointsMap={positionPointsMap}
              scores={scores}
              onScoresChange={setScores}
              onRemoveTeam={removeTeamScore}
              playerStatsByTeam={playerStatsByTeam}
              onReloadTeamPlayers={(teamId) => {
                if (!selectedMatch) return;
                void loadPlayersForTeam(teamId, selectedMatch);
              }}
              onUpdatePlayerKills={updatePlayerKills}
              onToggleMvp={toggleMvp}
              saving={saving}
              onSave={saveScores}
            />

            {loading && (
              <p className="text-center text-sm text-muted-foreground">Carregando…</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
