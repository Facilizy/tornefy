import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Target, Crown, Medal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
  is_external?: boolean;
}

interface TeamStanding {
  team: Team;
  totalKills: number;
  totalPositionPoints: number;
  totalKillPoints: number;
  totalPoints: number;
  matchesPlayed: number;
}

interface Round {
  id: string;
  name: string;
  round_number: number;
}

interface ScoreboardProps {
  trainingId: string;
  teams: Team[];
  primaryColor?: string;
  /** Controlled filter (round_id). Use "all" for all rounds. */
  selectedRoundId?: string;
  onSelectedRoundChange?: (roundId: string) => void;
}

export type ScoreboardHandle = {
  refresh: () => Promise<void>;
};

export const Scoreboard = forwardRef<ScoreboardHandle, ScoreboardProps>(function Scoreboard(
  // `primaryColor` pode vir em HEX (legacy). Se não vier, usamos o token do tema.
  { trainingId, teams, primaryColor = "hsl(var(--primary))", selectedRoundId, onSelectedRoundChange },
  ref
) {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [internalSelectedRound, setInternalSelectedRound] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const selectedRound = selectedRoundId ?? internalSelectedRound;
  const setSelectedRound = (roundId: string) => {
    if (selectedRoundId === undefined) setInternalSelectedRound(roundId);
    onSelectedRoundChange?.(roundId);
  };

  const matchIdsRef = useRef<Set<string>>(new Set());
  const refetchTimeoutRef = useRef<number | null>(null);
  const didInitRef = useRef(false);
  const fetchSeqRef = useRef(0);

  const scheduleRefetch = () => {
    if (refetchTimeoutRef.current) window.clearTimeout(refetchTimeoutRef.current);
    refetchTimeoutRef.current = window.setTimeout(() => {
      fetchStandings();
    }, 250);
  };

  const fetchMatchIds = async () => {
    const { data } = await supabase
      .from("training_matches")
      .select("id")
      .eq("training_id", trainingId);

    matchIdsRef.current = new Set((data || []).map((m: any) => m.id));
  };

  useEffect(() => {
    fetchRounds();
    fetchMatchIds().then(async () => {
      await fetchStandings();
      didInitRef.current = true;
    });

    // Realtime: update ranking when matches/scores change
    const matchesChannel = supabase
      .channel(`rt-training-matches-${trainingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_matches",
          filter: `training_id=eq.${trainingId}`,
        },
        async () => {
          await fetchMatchIds();
          scheduleRefetch();
        }
      )
      .subscribe();

    const scoresChannel = supabase
      .channel(`rt-training-scores-${trainingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_match_scores",
        },
        (payload) => {
          const matchId = (payload as any)?.new?.match_id ?? (payload as any)?.old?.match_id;
          if (matchId && matchIdsRef.current.has(matchId)) {
            scheduleRefetch();
          }
        }
      )
      .subscribe();

    return () => {
      if (refetchTimeoutRef.current) window.clearTimeout(refetchTimeoutRef.current);
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(scoresChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingId]);

  useEffect(() => {
    // Evita duplicar fetch no mount (reduz flicker).
    if (!didInitRef.current) return;
    fetchStandings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRound]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: async () => {
        await fetchMatchIds();
        await fetchStandings();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trainingId, selectedRound]
  );

  const fetchRounds = async () => {
    const { data } = await supabase
      .from("training_rounds")
      .select("*")
      .eq("training_id", trainingId)
      .order("round_number");

    if (data) {
      setRounds(data);
    }
  };

  const fetchStandings = async () => {
    const seq = ++fetchSeqRef.current;
    const hasPrevious = standings.length > 0;
    if (!hasPrevious) setLoading(true);
    else setRefreshing(true);

    try {
      // NOTE: There is no FK relationship cached between training_match_scores and training_matches,
      // so we cannot rely on `training_matches!inner(...)` joins here.
      const { data: matches, error: matchesError } = await supabase
        .from("training_matches")
        .select("id, round_id")
        .eq("training_id", trainingId)
        .order("match_number", { ascending: true });

      if (matchesError) throw matchesError;

      const filteredMatches =
        selectedRound && selectedRound !== "all"
          ? (matches || []).filter((m: any) => m.round_id === selectedRound)
          : (matches || []);

      const matchIds = filteredMatches.map((m: any) => m.id).filter(Boolean);

      if (matchIds.length === 0) {
        if (!hasPrevious) setStandings([]);
        return;
      }

      const { data: scores, error: scoresError } = await supabase
        .from("training_match_scores")
        .select("*")
        .in("match_id", matchIds);

      if (scoresError) throw scoresError;

      if (scores && scores.length > 0) {
        // Aggregate scores per team
        const teamScores: Record<
          string,
          {
            totalKills: number;
            totalPositionPoints: number;
            totalKillPoints: number;
            totalPoints: number;
            matchesPlayed: number;
          }
        > = {};

        scores.forEach((score: any) => {
          const teamId = String(score.team_id ?? "");
          if (!teamId) return;

          if (!teamScores[teamId]) {
            teamScores[teamId] = {
              totalKills: 0,
              totalPositionPoints: 0,
              totalKillPoints: 0,
              totalPoints: 0,
              matchesPlayed: 0,
            };
          }

          // Normalize numeric fields (bigint can arrive as string)
          const kills = Number(score.kills ?? 0);
          const posPts = Number(score.position_points ?? 0);
          const killPts = Number(score.kill_points ?? 0);
          const totalPts = Number(score.total_points ?? 0);

          teamScores[teamId].totalKills += kills;
          teamScores[teamId].totalPositionPoints += posPts;
          teamScores[teamId].totalKillPoints += killPts;
          teamScores[teamId].totalPoints += totalPts;
          teamScores[teamId].matchesPlayed += 1;
        });

        const standingsArray: TeamStanding[] = Object.entries(teamScores)
          .map(([teamId, stats]) => {
            const team = teams.find((t) => t.id === teamId);
            return {
              team: team || { id: teamId, name: "Equipe Desconhecida", tag: "???" },
              ...stats,
            };
          })
          .sort((a, b) => b.totalPoints - a.totalPoints);

        // Só aplica se for a resposta mais recente.
        if (seq === fetchSeqRef.current) setStandings(standingsArray);
      } else {
        // Avoid wiping UI during the brief delete+insert window when saving scores.
        // We'll keep the last standings and try again shortly.
        scheduleRefetch();
      }
    } catch {
      // keep last known UI
      scheduleRefetch();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-primary" />;
      case 2:
        return <Medal className="w-5 h-5 text-muted-foreground" />;
      case 3:
        return <Medal className="w-5 h-5 text-accent-foreground" />;
      default:
        return null;
    }
  };

  const getRowStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-primary/12 border-l-4 border-l-primary";
      // Sem realce de linha para 2º/3º (só o ícone já destaca bem e evita poluição visual).
      case 2:
      case 3:
        return "";
      default:
        return "";
    }
  };

  if (loading && standings.length === 0) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (standings.length === 0) {
    return (
      <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
        <div className="text-sm text-muted-foreground">Nenhuma pontuação registrada ainda.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6" style={{ color: primaryColor }} />
          Classificação Geral
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger className="w-44 bg-background/40">
              <SelectValue placeholder="Todas as rodadas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as rodadas</SelectItem>
              {rounds.map((round) => (
                <SelectItem key={round.id} value={round.id}>
                  {round.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {refreshing && <div className="mb-4 text-xs text-muted-foreground">Atualizando…</div>}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead className="w-14 text-xs uppercase tracking-[0.18em] opacity-80">P</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.18em] opacity-80">Equipe</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-[0.18em] opacity-80">J</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-[0.18em] opacity-80">
                <div className="flex items-center justify-center gap-1">
                  <Target className="w-4 h-4" />
                  K
                </div>
              </TableHead>
              <TableHead
                className="text-center text-xs uppercase tracking-[0.18em] font-extrabold"
                style={{ color: primaryColor }}
              >
                Pts
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {standings.map((standing, index) => {
              const name = String(standing.team.name ?? "Equipe").toUpperCase();
              const tag = String(standing.team.tag ?? "").toUpperCase();

              return (
                <TableRow
                  key={standing.team.id}
                  className={
                    getRowStyle(index + 1) +
                    " cursor-pointer transition-colors hover:bg-muted/20 border-border/40"
                  }
                  onClick={() => navigate(`/team/${standing.team.id}`)}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      {getPositionIcon(index + 1)}
                      <span className="font-extrabold tabular-nums">{index + 1}</span>
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {standing.team.logo_url ? (
                        <img
                          src={standing.team.logo_url}
                          alt={name}
                          className="w-10 h-10 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                          <DefaultAvatarMark className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold truncate">{name}</p>
                          {standing.team.is_external && (
                            <Badge variant="secondary" className="text-[8px] h-3 px-1 bg-muted/50 text-muted-foreground border-border/40 uppercase">
                              Convidada
                            </Badge>
                          )}
                        </div>
                        {tag ? (
                          <p className="text-xs text-muted-foreground truncate">[{tag}]</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center py-4 tabular-nums font-semibold">
                    {standing.matchesPlayed}
                  </TableCell>

                  <TableCell className="text-center py-4">
                    <Badge className="gap-1 bg-primary/15 text-primary border border-primary/20" variant="secondary">
                      <Target className="w-3 h-3" />
                      <span className="tabular-nums">{standing.totalKills}</span>
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center py-4">
                    <span className="text-lg font-black tabular-nums" style={{ color: primaryColor }}>
                      {standing.totalPoints}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
});
