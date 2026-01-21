import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

type PlayerLite = {
  player_name: string;
  team_id: string;
  kills: number;
  matchesPlayed: number;
  kd: number;
  user_id?: string | null;
  avatar_url?: string | null;
};

type MatchLite = { id: string; match_number: number | null; name: string | null };

type Row = {
  match_id: string;
  match_number: number | null;
  match_name: string | null;
  kills: number;
  is_mvp: boolean;
};

export function MvpPlayerDetailsDialog({
  open,
  onOpenChange,
  trainingId,
  player,
  teamLabel,
  onGoProfile,
  onGoTeam,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingId: string;
  player: PlayerLite | null;
  teamLabel?: string;
  onGoProfile?: (userId: string) => void;
  onGoTeam?: (teamId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const title = player ? player.player_name : "Jogador";

  useEffect(() => {
    let cancelled = false;
    if (!open || !player) return;

    const run = async () => {
      try {
        setLoading(true);

        const { data: matches, error: mErr } = await supabase
          .from("training_matches")
          .select("id, match_number, name")
          .eq("training_id", trainingId)
          .order("match_number", { ascending: true });

        if (mErr) throw mErr;

        const matchList = ((matches || []) as any[]).filter((m) => m?.id) as MatchLite[];
        const matchIds = matchList.map((m) => m.id);

        if (matchIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const matchById = new Map(matchList.map((m) => [m.id, m] as const));

        const { data: stats, error: sErr } = await supabase
          .from("training_player_stats")
          .select("match_id, kills, is_mvp")
          .in("match_id", matchIds)
          .eq("team_id", player.team_id)
          .eq("player_name", player.player_name);

        if (sErr) throw sErr;

        const history: Row[] = (stats || []).map((s: any) => {
          const meta = matchById.get(String(s.match_id));
          return {
            match_id: String(s.match_id),
            match_number: meta?.match_number ?? null,
            match_name: meta?.name ?? null,
            kills: Number(s.kills ?? 0),
            is_mvp: !!s.is_mvp,
          };
        });

        history.sort((a, b) => Number(a.match_number ?? 0) - Number(b.match_number ?? 0));
        if (!cancelled) setRows(history);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, player, trainingId]);

  const totals = useMemo(() => {
    const totalKills = rows.reduce((acc, r) => acc + (r.kills || 0), 0);
    const played = rows.length;
    const kd = played > 0 ? totalKills / played : 0;
    const mvps = rows.reduce((acc, r) => acc + (r.is_mvp ? 1 : 0), 0);
    return { totalKills, played, kd, mvps };
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {teamLabel ? `${teamLabel} • ` : ""}Kills: {player?.kills ?? 0} • Partidas: {player?.matchesPlayed ?? 0} •
            K.D: {(player?.kd ?? 0).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {player?.avatar_url ? <AvatarImage src={player.avatar_url} alt={title} /> : null}
              <AvatarFallback>{(title || "??").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">
              Total: <span className="text-foreground font-semibold">{totals.totalKills}</span> kills •
              <span className="ml-2 text-foreground font-semibold">{totals.played}</span> partidas •
              <span className="ml-2 text-foreground font-semibold">{totals.kd.toFixed(2)}</span> K.D •
              <span className="ml-2 text-foreground font-semibold">{totals.mvps}</span> MVP
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => player?.team_id && onGoTeam?.(player.team_id)}>
              Ver equipe
            </Button>
            <Button
              onClick={() => {
                if (player?.user_id) onGoProfile?.(player.user_id);
              }}
              disabled={!player?.user_id}
            >
              Ver perfil
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando histórico…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem histórico por partida para este jogador.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Queda</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Kills</TableHead>
                    <TableHead className="text-center">MVP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.match_id}>
                      <TableCell className="font-semibold">{r.match_number ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.match_name || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{r.kills}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.is_mvp ? <Badge variant="secondary">Sim</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
