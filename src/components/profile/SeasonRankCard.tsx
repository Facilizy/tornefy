import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GAME_LABELS,
  getNextTierProgress,
  getRankTier,
  getTriunfanteCutoff,
  type GameId,
} from "@/lib/ranking";
import { RankPill } from "@/components/ranking/RankPill";
import { TriunfanteInfoDialog } from "@/components/ranking/TriunfanteInfoDialog";
import { RankInsignia } from "@/components/ranking/RankInsignia";

type SeasonRow = { id: string; name: string; start_at: string; end_at: string | null };

export function SeasonRankCard({
  userId,
  gameId,
  seasonId,
  highlight,
}: {
  userId: string;
  gameId: GameId;
  seasonId?: string | null;
  highlight?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [position, setPosition] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [cutoffPoints, setCutoffPoints] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        const { data: seasons, error: sErr } = await supabase
          .from("ranking_seasons")
          .select("id, name, start_at, end_at")
          .order("start_at", { ascending: false });
        if (sErr) throw sErr;
        const rows = (seasons || []) as SeasonRow[];

        const now = Date.now();
        const active = rows.find((s) => {
          const start = new Date(s.start_at).getTime();
          const end = s.end_at ? new Date(s.end_at).getTime() : Number.POSITIVE_INFINITY;
          return now >= start && now < end;
        });

        const chosen = rows.find((r) => r.id === seasonId) || active || rows[0] || null;
        if (cancelled) return;
        setSeason(chosen);
        if (!chosen) {
          setPoints(0);
          setTotalPlayers(0);
          setCutoffPoints(null);
          return;
        }

        const { data: leaderboard, error: lErr } = await supabase
          .from("player_season_points")
          .select("user_id, points")
          .eq("season_id", chosen.id)
          .eq("game_id", gameId)
          .order("points", { ascending: false })
          .limit(500);
        if (lErr) throw lErr;

        const rowsLb = (leaderboard || []) as Array<{ user_id: string; points: number }>;
        const total = rowsLb.length;
        const myRow = rowsLb.find((r) => r.user_id === userId);
        const pts = myRow?.points ?? 0;
        const pos = rowsLb.findIndex((r) => r.user_id === userId);
        const position1 = pos >= 0 ? pos + 1 : null;

        const cutoffPos = total ? getTriunfanteCutoff(total) : 0;
        const cutoff = cutoffPos ? rowsLb[cutoffPos - 1]?.points ?? null : null;

        if (cancelled) return;
        setPoints(pts);
        setPosition(position1);
        setTotalPlayers(total);
        setCutoffPoints(typeof cutoff === "number" ? cutoff : null);
      } catch (e) {
        if (!cancelled) {
          setSeason(null);
          setPoints(0);
          setPosition(null);
          setTotalPlayers(0);
          setCutoffPoints(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, gameId, seasonId]);

  const seasonStatus = useMemo(() => {
    if (!season) return null;
    const start = new Date(season.start_at).getTime();
    const end = season.end_at ? new Date(season.end_at).getTime() : null;
    const now = Date.now();
    if (now < start) return { type: "pre" as const, label: `Abertura em ${new Date(season.start_at).toLocaleDateString("pt-BR")}` };
    if (end && now >= end) return { type: "post" as const, label: "Season encerrada" };
    return { type: "active" as const, label: "Season ativa" };
  }, [season]);

  const tier = useMemo(() => {
    return getRankTier({
      points,
      position: typeof position === "number" ? position : undefined,
      totalPlayers: totalPlayers || undefined,
    });
  }, [points, position, totalPlayers]);

  const progress = useMemo(() => getNextTierProgress(points), [points]);

  const showSkeleton = loading;

  return (
    <Card
      className={
        "relative overflow-hidden p-6 bg-card/50 border-border " +
        (highlight ? "border-primary/40 ring-1 ring-primary/15" : "")
      }
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {GAME_LABELS[gameId]} • {season?.name || "Season"}
          </p>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            {showSkeleton ? (
              <>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </>
            ) : (
              <>
                <h2 className="text-xl font-black uppercase">Ranking da Season</h2>
                <RankPill tierId={tier.id} />
              </>
            )}
          </div>
          {showSkeleton ? (
            <Skeleton className="mt-2 h-4 w-56" />
          ) : seasonStatus ? (
            <p className="mt-1 text-sm text-muted-foreground">{seasonStatus.label}</p>
          ) : null}
        </div>

        {showSkeleton ? (
          <Skeleton className="h-9 w-36 rounded-md" />
        ) : (
          <div className="flex items-center gap-3">
            <RankInsignia tierId={tier.id} label={tier.label} size="lg" />
            <TriunfanteInfoDialog
              totalPlayers={totalPlayers}
              cutoffPoints={cutoffPoints}
              triggerText="Regra Triunfante"
            />
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <p className="text-xs text-muted-foreground">Pontos</p>
          {showSkeleton ? (
            <Skeleton className="mt-2 h-9 w-24" />
          ) : (
            <p className="text-3xl font-black text-primary">{points}</p>
          )}
        </div>

        <div className="md:col-span-2 rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3">
            {showSkeleton ? (
              <>
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-16" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Progresso para {progress.isMax ? progress.current.label : progress.next.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {progress.isMax ? "Máximo" : `${Math.max(0, progress.end - points)} pts`}
                </p>
              </>
            )}
          </div>
          {showSkeleton ? (
            <>
              <Skeleton className="mt-3 h-2 w-full" />
              <div className="mt-2 flex items-center justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-14" />
              </div>
            </>
          ) : (
            <>
              <Progress value={progress.pct} className="h-2 mt-3" />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{progress.start} pts</span>
                <span>{progress.isMax ? "—" : `${progress.end} pts`}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* requisito extra do produto */}
      {showSkeleton ? (
        <Skeleton className="mt-4 h-4 w-3/4" />
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Triunfante exige 14.000+ pontos e estar dentro do cutoff (Top 3% ou Top 100).
        </p>
      )}
    </Card>
  );
}
