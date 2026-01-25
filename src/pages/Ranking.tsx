import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Users, Search, Loader2 } from "lucide-react";
import type { GameId } from "@/lib/ranking";
import { GAME_LABELS, getRankTier } from "@/lib/ranking";
import { RankPill } from "@/components/ranking/RankPill";
import { RankingPodium, type RankingPlayer } from "@/components/ranking/RankingPodium";
import { TriunfanteInfoDialog } from "@/components/ranking/TriunfanteInfoDialog";
import { useCountdown } from "@/hooks/useCountdown";
import { getCanonicalOrigin, setJsonLd, setSeo } from "@/lib/seo";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

const RANKING_START_AT = new Date("2026-03-01T00:00:00-03:00");

const Ranking = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const initialGame = (searchParams.get("game") || "free_fire") as GameId;
  const initialSeason = searchParams.get("season") || "";

  const [gameId, setGameId] = useState<GameId>(() => {
    return initialGame in GAME_LABELS ? initialGame : "free_fire";
  });
  const [seasonId, setSeasonId] = useState<string>(() => initialSeason);
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string; start_at: string; end_at: string | null }>>(
    []
  );
  const [players, setPlayers] = useState<RankingPlayer[]>([]);

  const countdown = useCountdown(RANKING_START_AT);
  const isLocked = !countdown.isOver;

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    setSeo({
      title: "Ranking • Tornefy",
      description:
        "Ranking de jogadores por jogo e temporada no Tornefy. Compare pontos, KD e descubra o Top da temporada.",
      canonical: getCanonicalOrigin() + "/ranking",
    });

    const origin = getCanonicalOrigin();
    setJsonLd("breadcrumbs-ranking", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: origin + "/" },
        { "@type": "ListItem", position: 2, name: "Ranking", item: origin + "/ranking" },
      ],
    });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    if (isLocked) return;
    fetchRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, gameId, isLocked]);

  // When the ranking is locked, we never fetch the leaderboard.
  // Ensure we don't keep the page in a perpetual skeleton state.
  useEffect(() => {
    if (loadingSeasons) return;
    if (!isLocked) return;
    setLoading(false);
    setPlayers([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, loadingSeasons]);

  const fetchSeasons = async () => {
    try {
      setLoadingSeasons(true);
      const { data, error } = await supabase
        .from("ranking_seasons")
        .select("id, name, start_at, end_at")
        .order("start_at", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as Array<{ id: string; name: string; start_at: string; end_at: string | null }>;
      setSeasons(rows);

      const now = Date.now();
      const active = rows.find((s) => {
        const start = new Date(s.start_at).getTime();
        const end = s.end_at ? new Date(s.end_at).getTime() : Number.POSITIVE_INFINITY;
        return now >= start && now < end;
      });

      const fromUrl = searchParams.get("season");
      const picked = (fromUrl && rows.some((r) => r.id === fromUrl) ? fromUrl : null) || active?.id || rows[0]?.id || "";
      setSeasonId(picked);

      // Keep URL in sync (deep-link)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("game", gameId);
        if (picked) next.set("season", picked);
        return next;
      });
    } catch (error) {
      console.error("Error fetching seasons:", error);
    } finally {
      setLoadingSeasons(false);
    }
  };

  const fetchRanking = async () => {
    try {
      setLoading(true);
      setPlayers([]);

      const { data: pointsRows, error: pointsErr } = await supabase
        .from("player_season_points")
        .select("user_id, points")
        .eq("season_id", seasonId)
        .eq("game_id", gameId)
        .order("points", { ascending: false })
        .limit(200);
      if (pointsErr) throw pointsErr;

      const base = (pointsRows || []) as Array<{ user_id: string; points: number }>;
      const userIds = base.map((r) => r.user_id).filter(Boolean);
      if (userIds.length === 0) {
        setPlayers([]);
        return;
      }

      const [{ data: profs, error: pErr }, { data: members, error: mErr }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", userIds),
        supabase
          .from("team_members")
          .select("id, user_id, team_id, created_at")
          .in("user_id", userIds)
          .order("created_at", { ascending: true }),
      ]);
      if (pErr) throw pErr;
      if (mErr) throw mErr;

      const profileById = new Map(
        (profs || []).map((p: any) => [p.id, { full_name: p.full_name ?? null, username: p.username ?? null, avatar_url: p.avatar_url ?? null }])
      );

      const firstTeamIdByUser = new Map<string, string>();
      const memberIdToUserId = new Map<string, string>();

      (members || []).forEach((m: any) => {
        if (m?.id && m?.user_id) memberIdToUserId.set(m.id as string, m.user_id as string);
        if (!m?.user_id || !m?.team_id) return;
        if (!firstTeamIdByUser.has(m.user_id as string)) firstTeamIdByUser.set(m.user_id as string, m.team_id as string);
      });

      const teamIds = Array.from(new Set(Array.from(firstTeamIdByUser.values())));
      const { data: teams, error: tErr } = teamIds.length
        ? await supabase.from("teams").select("id, tag").in("id", teamIds)
        : { data: [], error: null };
      if (tErr) throw tErr;
      const teamTagById = new Map((teams || []).map((t: any) => [t.id, t.tag ?? null]));

      const memberIds = (members || []).map((m: any) => m.id).filter(Boolean) as string[];
      const kdByUser = new Map<string, { kills: number; matches: Set<string> }>();
      if (memberIds.length) {
        const { data: statsRows, error: sErr } = await supabase
          .from("training_player_stats")
          .select("kills, match_id, team_member_id")
          .in("team_member_id", memberIds);
        if (sErr) throw sErr;

        (statsRows || []).forEach((r: any) => {
          const memberId = r.team_member_id as string | null;
          const uid = memberId ? memberIdToUserId.get(memberId) : null;
          if (!uid) return;
          const cur = kdByUser.get(uid) || { kills: 0, matches: new Set<string>() };
          cur.kills += r.kills ?? 0;
          if (r.match_id) cur.matches.add(r.match_id as string);
          kdByUser.set(uid, cur);
        });
      }

      const totalPlayers = base.length;
      const merged: RankingPlayer[] = base.map((r, idx) => {
        const prof = profileById.get(r.user_id);
        const mainTeamId = firstTeamIdByUser.get(r.user_id);
        const kdAgg = kdByUser.get(r.user_id);
        const matches = kdAgg?.matches.size || 0;
        const kd = matches ? kdAgg!.kills / matches : null;
        const tier = getRankTier({ points: r.points ?? 0, position: idx + 1, totalPlayers });
        return {
          user_id: r.user_id,
          points: r.points ?? 0,
          full_name: prof?.full_name ?? null,
          username: prof?.username ?? null,
          avatar_url: prof?.avatar_url ?? null,
          team_tag: mainTeamId ? teamTagById.get(mainTeamId) ?? null : null,
          kd,
          tierId: tier.id,
        };
      });

      setPlayers(merged);
    } catch (error) {
      console.error("Error fetching ranking:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => {
      const hay = [p.full_name, p.username, p.team_tag].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [players, searchTerm]);

  const cutoffInfo = useMemo(() => {
    const total = players.length;
    if (!total) return { totalPlayers: 0, cutoffPos: 0, cutoffPoints: null as number | null };
    const cutoffPos = Math.min(100, Math.max(1, Math.ceil(total * 0.03)));
    const cutoffPoints = players[cutoffPos - 1]?.points ?? null;
    return { totalPlayers: total, cutoffPos, cutoffPoints };
  }, [players]);

  // While locked, we show a premium empty state (not skeletons).
  const showSkeleton = loadingSeasons || (!isLocked && loading);

  const setUrlParams = (nextGameId: GameId, nextSeasonId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("game", nextGameId);
      if (nextSeasonId) next.set("season", nextSeasonId);
      return next;
    });
  };

  return (
      <MainLayout>
       <header className="relative py-12 md:py-14 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/18 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
              {showSkeleton ? (
                <Skeleton className="h-10 md:h-12 w-48 mx-auto" />
              ) : (
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground">
                  Ranking
                </h1>
              )}
          </div>
           {showSkeleton ? (
             <Skeleton className="h-4 w-72 mx-auto" />
           ) : (
             <p className="text-muted-foreground max-w-md mx-auto">
               Ranking de jogadores por jogo e temporada
             </p>
           )}

           {showSkeleton ? null : isLocked ? (
             <div className="mt-4 inline-flex flex-col items-center gap-2">
               <div className="text-xs text-muted-foreground border border-border bg-card/40 px-3 py-1 rounded-full">
                 A ranqueada inicia em <strong>01/03/2026</strong>
               </div>
               <div className="text-sm font-semibold">
                 Faltam {countdown.days}d {countdown.hours}h {countdown.minutes}m
               </div>
             </div>
           ) : null}

           <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
             {showSkeleton ? (
               <>
                 <Skeleton className="h-6 w-56 rounded-full" />
                 <Skeleton className="h-9 w-24" />
               </>
             ) : (
               <>
                  {!isLocked ? (
                    <div className="text-xs text-muted-foreground border border-border bg-card/40 px-3 py-1 rounded-full">
                      Cutoff Triunfante: Top {cutoffInfo.cutoffPos || "—"}
                      {typeof cutoffInfo.cutoffPoints === "number" ? ` • ${cutoffInfo.cutoffPoints} pts` : ""}
                    </div>
                  ) : null}
                 <TriunfanteInfoDialog
                   totalPlayers={cutoffInfo.totalPlayers}
                   cutoffPoints={cutoffInfo.cutoffPoints}
                   triggerText="Entender"
                   triggerVariant="ghost"
                 />
               </>
             )}
           </div>
        </div>
      </header>

       <main className="container mx-auto px-4 pb-12">
        {/* Filters (sticky) */}
         <section className="sticky top-16 md:top-16 z-20 -mx-4 px-4 pb-3 mb-6 bg-background/60 backdrop-blur border-b border-border/60">
           {showSkeleton ? (
             <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_240px] gap-3 md:gap-4 pt-3">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_240px] gap-3 md:gap-4 pt-3">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <Input
                   placeholder="Buscar jogador, @ ou tag..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-10 bg-card/50 backdrop-blur"
                 />
               </div>

               <Select
                 value={gameId}
                 onValueChange={(v) => {
                   const nextGame = v as GameId;
                   setGameId(nextGame);
                   setUrlParams(nextGame, seasonId);
                 }}
               >
                 <SelectTrigger className="w-full bg-card/50 backdrop-blur">
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

               <Select
                 value={seasonId}
                 onValueChange={(v) => {
                   setSeasonId(v);
                   setUrlParams(gameId, v);
                 }}
                 disabled={!seasons.length}
               >
                 <SelectTrigger className="w-full bg-card/50 backdrop-blur">
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
             </div>
           )}
         </section>

        {/* Top 3 */}
        {isLocked && !showSkeleton ? (
          <Card className="p-8 bg-card/50 border-border text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-1">Ranking ainda não começou</h3>
            <p className="text-muted-foreground">
              O placar será liberado quando a ranqueada iniciar.
            </p>
          </Card>
        ) : showSkeleton ? (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 animate-fade-in">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-5 md:p-6 bg-card/50 border-border backdrop-blur">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-56" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-7 w-16 ml-auto" />
                    <Skeleton className="mt-2 h-3 w-12 ml-auto" />
                  </div>
                </div>
              </Card>
            ))}
          </section>
        ) : (
          <RankingPodium
            players={filteredPlayers.slice(0, 3)}
            onOpenProfile={(userId) =>
              navigate(
                `/profile/${userId}?game=${encodeURIComponent(gameId)}&season=${encodeURIComponent(seasonId)}`
              )
            }
          />
        )}

        {/* List */}
        {!isLocked ? (
        <section className="space-y-2">
          {showSkeleton
            ? Array.from({ length: 10 }).map((_, i) => (
                <Card
                  key={i}
                  className="p-4 md:p-5 bg-card/45 border-border backdrop-blur animate-fade-in"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-5 w-56" />
                      <Skeleton className="mt-2 h-4 w-44" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-6 w-14 ml-auto" />
                      <Skeleton className="mt-2 h-3 w-12 ml-auto" />
                    </div>
                  </div>
                </Card>
              ))
            : filteredPlayers.map((p, index) => (
            <button
              key={p.user_id}
              type="button"
              onClick={() =>
                navigate(
                  `/profile/${p.user_id}?game=${encodeURIComponent(gameId)}&season=${encodeURIComponent(seasonId)}`
                )
              }
               className="w-full text-left group transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] motion-reduce:transform-none"
            >
              <Card
                className={
                   "p-4 md:p-5 bg-card/45 border-border hover:border-primary/40 transition-colors backdrop-blur " +
                   "hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 " +
                   (index === 0 ? "bg-primary/10 border-primary/30" : "")
                }
              >
                <div className="flex items-center gap-4">
                   <div className="w-12 flex items-center justify-center">
                     <span
                       className={
                         "text-lg md:text-xl font-black tabular-nums transition-colors " +
                         (index < 3 ? "text-primary" : "text-muted-foreground") +
                         " group-hover:text-foreground"
                       }
                     >
                      #{index + 1}
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.full_name || p.username || "Avatar"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <DefaultAvatarMark className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                   <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                       <p className="font-extrabold uppercase truncate tracking-tight">
                         {p.full_name || p.username || "Jogador"}
                       </p>
                      <RankPill tierId={p.tierId} />
                      {p.team_tag ? <span className="text-xs text-muted-foreground">[{p.team_tag}]</span> : null}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      {p.username ? <span>@{p.username}</span> : null}
                      {typeof p.kd === "number" ? <span>• K/D {p.kd.toFixed(2)}</span> : <span>• K/D —</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-black leading-none">{p.points}</p>
                    <p className="text-xs text-muted-foreground">pontos</p>
                  </div>
                </div>
              </Card>
            </button>
              ))}
        </section>
        ) : null}

        {!showSkeleton && filteredPlayers.length === 0 && (
          <div className="py-12 md:py-16">
            <Card className="p-8 md:p-10 bg-card/50 border-border backdrop-blur text-center">
              <h3 className="text-xl font-black uppercase tracking-tight">Nenhum jogador nesta season</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Troque a season/jogo acima ou aguarde o início da temporada para ver o ranking.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                <div className="text-xs text-muted-foreground border border-border bg-background/40 px-3 py-1 rounded-full">
                  Cutoff Triunfante: Top {cutoffInfo.cutoffPos || "—"}
                </div>
                <TriunfanteInfoDialog
                  totalPlayers={cutoffInfo.totalPlayers}
                  cutoffPoints={cutoffInfo.cutoffPoints}
                  triggerText="Entender regra"
                  triggerVariant="ghost"
                />
              </div>
            </Card>
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default Ranking;
