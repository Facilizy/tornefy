import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";
import { Loader2, Save, Trophy } from "lucide-react";
import { toast } from "sonner";

type Team = {
  id: string;
  name: string | null;
  tag: string | null;
  logo_url: string | null;
};

type ScoreRow = {
  id: string;
  tournament_id: string;
  team_id: string;
  points: number;
  kills: number;
  teams?: Team | null;
};

type RowVM = {
  team: Team;
  points: number;
  kills: number;
  scoreId?: string;
};

export function TournamentScoreboard({
  tournamentId,
  canManage,
}: {
  tournamentId: string;
  canManage: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<RowVM[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [scoresRes, regsRes] = await Promise.all([
        (supabase as any)
          .from("tournament_team_scores")
          .select("id,tournament_id,team_id,points,kills, teams(id,name,tag,logo_url)")
          .eq("tournament_id", tournamentId),
        (supabase as any)
          .from("tournament_registrations")
          .select("team_id, teams(id,name,tag,logo_url)")
          .eq("tournament_id", tournamentId)
          .neq("status", "cancelled"),
      ]);

      if (scoresRes.error) throw scoresRes.error;
      if (regsRes.error) throw regsRes.error;

      const teamMap = new Map<string, Team>();
      (regsRes.data || []).forEach((r: any) => {
        if (r?.teams?.id) teamMap.set(String(r.teams.id), r.teams as Team);
      });

      const scoreByTeam = new Map<string, ScoreRow>();
      (scoresRes.data || []).forEach((s: any) => {
        scoreByTeam.set(String(s.team_id), s as ScoreRow);
        if (s?.teams?.id) teamMap.set(String(s.teams.id), s.teams as Team);
      });

      const merged: RowVM[] = Array.from(teamMap.entries()).map(([teamId, team]) => {
        const s = scoreByTeam.get(teamId);
        return {
          team,
          points: Number(s?.points ?? 0),
          kills: Number(s?.kills ?? 0),
          scoreId: s?.id,
        };
      });

      merged.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.kills - a.kills;
      });

      setRows(merged);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar placar");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const hasTeams = useMemo(() => rows.length > 0, [rows.length]);

  const updateRow = (teamId: string, patch: Partial<Pick<RowVM, "points" | "kills">>) => {
    setRows((prev) =>
      prev.map((r) => (String(r.team.id) === String(teamId) ? { ...r, ...patch } : r))
    );
  };

  const saveAll = async () => {
    try {
      setSaving(true);

      const payload = rows.map((r) => ({
        tournament_id: tournamentId,
        team_id: r.team.id,
        points: Number.isFinite(r.points) ? r.points : 0,
        kills: Number.isFinite(r.kills) ? r.kills : 0,
      }));

      const { error } = await (supabase as any)
        .from("tournament_team_scores")
        .upsert(payload, { onConflict: "tournament_id,team_id" });

      if (error) throw error;
      toast.success("Placar salvo!");
      await fetchData();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar placar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card/50 border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando placar…
        </div>
      </Card>
    );
  }

  if (!hasTeams) {
    return (
      <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
        <div className="text-sm text-muted-foreground">Nenhuma equipe inscrita ainda.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Classificação Geral
        </h2>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={fetchData} disabled={saving}>
            Atualizar
          </Button>
          {canManage ? (
            <Button type="button" onClick={saveAll} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead className="w-14 text-xs uppercase tracking-[0.18em] opacity-80">P</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.18em] opacity-80">Equipe</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-[0.18em] opacity-80">K</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-[0.18em] opacity-80">Pts</TableHead>
              {canManage ? (
                <TableHead className="text-right text-xs uppercase tracking-[0.18em] opacity-80">
                  Editar
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r, index) => {
              const name = String(r.team.name ?? "Equipe").toUpperCase();
              const tag = String(r.team.tag ?? "").toUpperCase();

              return (
                <TableRow key={r.team.id} className="border-border/40">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold tabular-nums">{index + 1}</span>
                    </div>
                  </TableCell>

                  <TableCell className="py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {r.team.logo_url ? (
                        <img
                          src={r.team.logo_url}
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
                        <p className="font-semibold truncate">{name}</p>
                        {tag ? <p className="text-xs text-muted-foreground truncate">[{tag}]</p> : null}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center py-4">
                    <Badge variant="secondary" className="tabular-nums">
                      {r.kills}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center py-4">
                    <span className="text-lg font-black tabular-nums text-primary">{r.points}</span>
                  </TableCell>

                  {canManage ? (
                    <TableCell className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          aria-label={`Kills de ${name}`}
                          inputMode="numeric"
                          className="w-20 bg-background/40"
                          value={String(r.kills)}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value || "0", 10);
                            updateRow(r.team.id, { kills: Number.isFinite(n) ? n : 0 });
                          }}
                        />
                        <Input
                          aria-label={`Pontos de ${name}`}
                          inputMode="numeric"
                          className="w-20 bg-background/40"
                          value={String(r.points)}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value || "0", 10);
                            updateRow(r.team.id, { points: Number.isFinite(n) ? n : 0 });
                          }}
                        />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canManage ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Dica: edite Kills e Pontos e clique em “Salvar”.
        </p>
      ) : null}
    </Card>
  );
}
