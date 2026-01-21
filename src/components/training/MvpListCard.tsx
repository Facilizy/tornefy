import { useEffect, useMemo, useState } from "react";
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

export function MvpListCard({ trainingId, teams }: { trainingId: string; teams: TeamLite[] }) {
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
          .select("id")
          .eq("training_id", trainingId);

        const matchIds = (matches || []).map((m: any) => m.id).filter(Boolean);
        if (matchIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const { data: stats, error } = await supabase
          .from("training_player_stats")
          .select("player_name, team_id, kills, is_mvp, match_id, team_member_id")
          .in("match_id", matchIds)
          .eq("is_mvp", true);

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
          const key = `${s.player_name}::${s.team_id}`;
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

          const userId = s.team_member_id ? memberToUser.get(String(s.team_member_id)) : undefined;
          if (userId && !prev.user_id) {
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
  }, [trainingId]);

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

  if (rows.length === 0) return null;

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-bold">MVPs do Treino</h3>
        <p className="text-xs text-muted-foreground">
          Lista (10 por vez). Clique no jogador para abrir o perfil.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
              return (
                <TableRow
                  key={`${r.player_name}-${r.team_id}`}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => {
                    setSelected(r);
                    setDetailsOpen(true);
                  }}
                >
                  <TableCell className="font-bold">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {r.avatar_url ? <AvatarImage src={r.avatar_url} alt={r.player_name} /> : null}
                        <AvatarFallback>
                          {(r.player_name || "??").slice(0, 2).toUpperCase()}
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
                    <Badge variant="outline">{r.kills}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{r.matchesPlayed}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{r.kd.toFixed(2)}</Badge>
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
