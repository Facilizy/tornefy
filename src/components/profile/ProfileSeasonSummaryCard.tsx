import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RankPill } from "@/components/ranking/RankPill";
import { GAME_LABELS, getRankTier, type GameId } from "@/lib/ranking";
import { Award, ArrowRight } from "lucide-react";

type SeasonRow = { id: string; name: string; start_at: string; end_at: string | null };

export function ProfileSeasonSummaryCard({
  userId,
  gameId,
  seasonId,
}: {
  userId: string;
  gameId: GameId;
  seasonId?: string | null;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [position, setPosition] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);

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
          setPosition(null);
          setTotalPlayers(0);
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
        const idx = rowsLb.findIndex((r) => r.user_id === userId);
        const pos = idx >= 0 ? idx + 1 : null;

        if (cancelled) return;
        setPoints(pts);
        setPosition(pos);
        setTotalPlayers(total);
      } catch {
        if (!cancelled) {
          setSeason(null);
          setPoints(0);
          setPosition(null);
          setTotalPlayers(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, gameId, seasonId]);

  const tier = useMemo(() => {
    return getRankTier({
      points,
      position: typeof position === "number" ? position : undefined,
      totalPlayers: totalPlayers || undefined,
    });
  }, [points, position, totalPlayers]);

  const showSkeleton = loading;

  return (
    <Card className="p-6 bg-card/50 border-border backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {GAME_LABELS[gameId]} • {season?.name || "Season"}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {showSkeleton ? (
              <>
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </>
            ) : (
              <>
                <p className="text-lg font-black uppercase tracking-tight">Resumo</p>
                <RankPill tierId={tier.id} />
              </>
            )}
          </div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Espaço para logo/arte da patente */}
      <div className="mt-5 relative overflow-hidden rounded-xl border border-border bg-background/40 p-4">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/12 via-transparent to-transparent" />
        <div className="relative">
          {showSkeleton ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <p className="text-[11px] text-muted-foreground">Posição</p>
                <p className="text-2xl font-black tabular-nums">{position ? `#${position}` : "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <p className="text-[11px] text-muted-foreground">Pontos</p>
                <p className="text-2xl font-black tabular-nums text-primary">{points}</p>
              </div>
              <div className="col-span-2 rounded-lg border border-border bg-card/40 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Patente</p>
                  <p className="text-lg font-black uppercase tracking-tight">{tier.label}</p>
                </div>
                <div className="h-12 w-24 rounded-lg border border-border bg-background/40 flex items-center justify-center text-xs text-muted-foreground">
                  Logo
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-5 w-full justify-between"
        onClick={() =>
          navigate(
            `/ranking?game=${encodeURIComponent(gameId)}&season=${encodeURIComponent(season?.id || seasonId || "")}`
          )
        }
      >
        Ver no ranking
        <ArrowRight className="w-4 h-4" />
      </Button>
    </Card>
  );
}
