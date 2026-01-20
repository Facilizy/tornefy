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

type TeamLite = { id: string; name: string; tag: string; logo_url?: string | null };

type MvpRow = {
  player_name: string;
  team_id: string;
  mvps: number;
  kills: number;
};

export function MvpListCard({ trainingId, teams }: { trainingId: string; teams: TeamLite[] }) {
  const [rows, setRows] = useState<MvpRow[]>([]);
  const [loading, setLoading] = useState(true);

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
          .select("player_name, team_id, kills, is_mvp, match_id")
          .in("match_id", matchIds)
          .eq("is_mvp", true);

        if (error) throw error;

        const agg = new Map<string, MvpRow>();
        (stats || []).forEach((s: any) => {
          const key = `${s.player_name}::${s.team_id}`;
          const prev = agg.get(key) || {
            player_name: s.player_name,
            team_id: s.team_id,
            mvps: 0,
            kills: 0,
          };
          prev.mvps += 1;
          prev.kills += Number(s.kills || 0);
          agg.set(key, prev);
        });

        const sorted = Array.from(agg.values())
          .sort((a, b) => (b.mvps - a.mvps) || (b.kills - a.kills))
          .slice(0, 20);

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

  return (
    <Card className="p-6 bg-card/80 border-border">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-bold">MVPs do Treino</h3>
        <p className="text-xs text-muted-foreground">Top jogadores por MVP (desempate: kills)</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Jogador</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead className="text-center">MVP</TableHead>
              <TableHead className="text-center">Kills</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => {
              const team = teamById.get(r.team_id);
              return (
                <TableRow key={`${r.player_name}-${r.team_id}`}> 
                  <TableCell className="font-bold">{idx + 1}</TableCell>
                  <TableCell className="font-semibold">{r.player_name}</TableCell>
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
                    <Badge variant="secondary">{r.mvps}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{r.kills}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
