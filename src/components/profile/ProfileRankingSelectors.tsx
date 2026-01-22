import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { GameId } from "@/lib/ranking";
import { GAME_LABELS } from "@/lib/ranking";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SeasonRow = { id: string; name: string; start_at: string; end_at: string | null };

export function ProfileRankingSelectors({
  defaultGame = "free_fire",
}: {
  defaultGame?: GameId;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const gameId = (searchParams.get("game") || defaultGame) as GameId;
  const seasonId = searchParams.get("season") || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("ranking_seasons")
          .select("id, name, start_at, end_at")
          .order("start_at", { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        const rows = (data || []) as SeasonRow[];
        setSeasons(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeSeasonId = useMemo(() => {
    const now = Date.now();
    const active = seasons.find((s) => {
      const start = new Date(s.start_at).getTime();
      const end = s.end_at ? new Date(s.end_at).getTime() : Number.POSITIVE_INFINITY;
      return now >= start && now < end;
    });
    return active?.id || seasons[0]?.id || "";
  }, [seasons]);

  // Ensure a season is always present in the URL once seasons load
  useEffect(() => {
    if (loading) return;
    if (!seasons.length) return;
    if (seasonId) return;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("game", gameId);
      next.set("season", activeSeasonId);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, seasons.length, activeSeasonId]);

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    });
  };

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Select value={gameId} onValueChange={(v) => setParam("game", v)}>
        <SelectTrigger className="w-full bg-card/50">
          <SelectValue placeholder="Jogo" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(GAME_LABELS).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={seasonId || activeSeasonId} onValueChange={(v) => setParam("season", v)}>
        <SelectTrigger className="w-full bg-card/50">
          <SelectValue placeholder="Season" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}
