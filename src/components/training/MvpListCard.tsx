import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { MvpPlayerDetailsDialog } from "@/components/training/MvpPlayerDetailsDialog";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";
import { Trophy } from "lucide-react";

type TeamLite = { id: string; name: string; tag: string; logo_url?: string | null };

type MvpRow = {
  player_name: string;
  team_id: string;
  kills: number;
  matchesPlayed: number;
  kd: number;
  user_id?: string | null;
  avatar_url?: string | null;
};

const PAGE_SIZE = 10;

function StatPill({ children, variant }: { children: ReactNode; variant: "neutral" | "accent" }) {
  return (
    <Badge
      variant={variant === "accent" ? "secondary" : "outline"}
      className="rounded-full px-3 py-1 text-xs font-semibold tabular-nums"
    >
      {children}
    </Badge>
  );
}

function PodiumCard({ 
  player, 
  rank, 
  teamLabel, 
  onClick 
}: { 
  player: MvpRow; 
  rank: number; 
  teamLabel?: string;
  onClick: () => void;
}) {
  const isFirst = rank === 1;
  const medalColor = rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-400" : "text-amber-700";
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full motion-safe:transition-transform motion-safe:hover:scale-[1.02]"
    >
      <Card className={
        "relative overflow-hidden p-4 bg-card/60 border-border hover:border-primary/40 motion-safe:transition-colors " +
        (isFirst ? "border-primary/35" : "")
      }>
        {isFirst ? (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/18 via-transparent to-transparent" />
        ) : null}
        
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-14 w-14 border-2 border-border">
              {player.avatar_url ? (
                <AvatarImage src={player.avatar_url} alt={player.player_name} />
              ) : null}
              <AvatarFallback>
                <DefaultAvatarMark className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center ${medalColor}`}>
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate text-sm">{player.player_name}</div>
            {teamLabel ? (
              <div className="text-xs text-muted-foreground truncate mt-0.5">{teamLabel}</div>
            ) : null}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{player.matchesPlayed} partida(s)</span>
              <span>•</span>
              <span>K.D {player.kd.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <div className={"text-2xl font-black leading-none tabular-nums " + (isFirst ? "text-primary" : "")}>
              {player.kills}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">kills</div>
          </div>
        </div>
      </Card>
    </button>
  );
}

export function MvpListCard({
  trainingId,
  teams,
  selectedRoundId,
}: {
  trainingId: string;
  teams: TeamLite[];
  /** "all" = todas as rodadas */
  selectedRoundId?: string;
}) {
  const [rows, setRows] = useState<MvpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<MvpRow | null>(null);
  const navigate = useNavigate();

  const teamById = useMemo(() => {
    const map = new Map<string, TeamLite>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setVisibleCount(PAGE_SIZE);

        const { data: matches } = await supabase
          .from("training_matches")
          .select("id, round_id")
          .eq("training_id", trainingId);

        const filteredMatches =
          selectedRoundId && selectedRoundId !== "all"
            ? (matches || []).filter((m: any) => String(m.round_id || "") === selectedRoundId)
            : (matches || []);

        const matchIds = filteredMatches.map((m: any) => m.id).filter(Boolean);
        if (matchIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const { data: stats, error } = await supabase
          .from("training_player_stats")
          .select("player_name, team_id, kills, match_id, team_member_id")
          .in("match_id", matchIds);

        if (error) throw error;

        const memberIds = Array.from(
          new Set((stats || []).map((s: any) => s.team_member_id).filter(Boolean))
        );

        const memberToUser = new Map<string, string>();
        if (memberIds.length > 0) {
          const { data: members } = await supabase
            .from("team_members")
            .select("id, user_id")
            .in("id", memberIds);

          (members || []).forEach((m: any) => {
            if (m?.id && m?.user_id) memberToUser.set(String(m.id), String(m.user_id));
          });
        }

        const userIds = Array.from(new Set(Array.from(memberToUser.values())));
        const userToAvatar = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, avatar_url")
            .in("id", userIds);

          (profiles || []).forEach((p: any) => {
            if (p?.id && p?.avatar_url) userToAvatar.set(String(p.id), String(p.avatar_url));
          });
        }

        const agg = new Map<
          string,
          {
            player_name: string;
            team_id: string;
            kills: number;
            matchIds: Set<string>;
            user_id?: string | null;
            avatar_url?: string | null;
          }
        >();

        (stats || []).forEach((s: any) => {
          const userId = s.team_member_id ? memberToUser.get(String(s.team_member_id)) : undefined;
          // Regra: só entra no ranking quem tem conta na plataforma
          if (!userId) return;

          const key = `${userId}::${s.team_id}`;
          const prev =
            agg.get(key) ||
            {
              player_name: s.player_name,
              team_id: s.team_id,
              kills: 0,
              matchIds: new Set<string>(),
              user_id: null as string | null,
              avatar_url: null as string | null,
            };

          prev.kills += Number(s.kills || 0);
          if (s.match_id) prev.matchIds.add(String(s.match_id));

          if (!prev.user_id) {
            prev.user_id = userId;
            prev.avatar_url = userToAvatar.get(userId) || null;
          }

          agg.set(key, prev);
        });

        const sorted: MvpRow[] = Array.from(agg.values())
          .map((v) => {
            const matchesPlayed = v.matchIds.size || 0;
            const kd = matchesPlayed > 0 ? v.kills / matchesPlayed : 0;
            return {
              player_name: v.player_name,
              team_id: v.team_id,
              kills: v.kills,
              matchesPlayed,
              kd,
              user_id: v.user_id ?? null,
              avatar_url: v.avatar_url ?? null,
            };
          })
          .sort((a, b) => b.kills - a.kills || b.kd - a.kd);

        if (!cancelled) setRows(sorted);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [trainingId, selectedRoundId]);

  if (loading) {
    return (
      <Card className="p-6 bg-card/80 border-border">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-6 bg-card/80 border-border">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-lg font-bold">Ranking de Kills</h3>
          <p className="text-xs text-muted-foreground">
            Só jogadores com conta. Respeita o filtro da Classificação Geral.
          </p>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Ainda não há kills lançadas para este filtro.
        </div>
      </Card>
    );
  }

  const top3 = rows.slice(0, 3);
  const hasTop3 = top3.length === 3;
  const visibleRows = rows.slice(0, visibleCount);
  const canShowMore = visibleCount < rows.length;

  const selectedTeamLabel = selected
    ? (() => {
        const t = teamById.get(selected.team_id);
        return t ? `${t.name} [${t.tag}]` : undefined;
      })()
    : undefined;

  return (
    <Card className="p-6 bg-card/80 border-border">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight">Ranking de Kills</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Top 3 em destaque. Clique no jogador para ver detalhes.
          </p>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          Total: <span className="text-foreground font-semibold">{rows.length}</span>
        </div>
      </div>

      {/* Pódio Top 3 */}
      {hasTop3 ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:order-2">
            <PodiumCard
              player={top3[0]}
              rank={1}
              teamLabel={teamById.get(top3[0].team_id)?.name}
              onClick={() => {
                setSelected(top3[0]);
                setDetailsOpen(true);
              }}
            />
          </div>
          <div className="md:order-1">
            <PodiumCard
              player={top3[1]}
              rank={2}
              teamLabel={teamById.get(top3[1].team_id)?.name}
              onClick={() => {
                setSelected(top3[1]);
                setDetailsOpen(true);
              }}
            />
          </div>
          <div className="md:order-3">
            <PodiumCard
              player={top3[2]}
              rank={3}
              teamLabel={teamById.get(top3[2].team_id)?.name}
              onClick={() => {
                setSelected(top3[2]);
                setDetailsOpen(true);
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Tabela completa */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-background/20">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Jogador</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead className="text-center">Kills</TableHead>
              <TableHead className="text-center">Partidas</TableHead>
              <TableHead className="text-center">K.D</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((r, idx) => {
              const team = teamById.get(r.team_id);
              const rank = idx + 1;
              return (
                <TableRow
                  key={`${r.user_id || r.player_name}-${r.team_id}`}
                  className={
                    "cursor-pointer motion-safe:transition-colors hover:bg-muted/30 " +
                    (rank === 1 ? "bg-muted/20" : "")
                  }
                  onClick={() => {
                    setSelected(r);
                    setDetailsOpen(true);
                  }}
                >
                  <TableCell className="font-bold tabular-nums">{rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {r.avatar_url ? <AvatarImage src={r.avatar_url} alt={r.player_name} /> : null}
                        <AvatarFallback>
                          <DefaultAvatarMark className="h-4 w-4 text-muted-foreground" title={`Avatar padrão de ${r.player_name}`} />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.player_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.matchesPlayed} partida(s) • K.D {r.kd.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {team ? (
                      <span className="text-sm">
                        {team.name} <span className="text-muted-foreground">[{team.tag}]</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Equipe</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatPill variant="neutral">{r.kills}</StatPill>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatPill variant="accent">{r.matchesPlayed}</StatPill>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatPill variant="neutral">{r.kd.toFixed(2)}</StatPill>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canShowMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            Ver mais
          </Button>
        </div>
      )}

      <MvpPlayerDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        trainingId={trainingId}
        player={selected}
        teamLabel={selectedTeamLabel}
        onGoTeam={(teamId) => navigate(`/team/${teamId}`)}
        onGoProfile={(userId) => navigate(`/profile/${userId}`)}
      />
    </Card>
  );
}
