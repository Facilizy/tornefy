import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, UserPlus } from "lucide-react";
import { fetchVerifiedMap } from "@/hooks/useVerifiedEntities";
import { TeamVerifiedBadge } from "@/components/TeamVerifiedBadge";
import { hexToHslTriplet } from "@/lib/color";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamCardSkeleton } from "@/components/skeletons/TeamCardSkeleton";
import { PlayerTradingCardSkeleton } from "@/components/skeletons/PlayerTradingCardSkeleton";
import { IntegratedGamesChips } from "@/components/IntegratedGamesChips";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";
import {
  PlayerTradingCard,
  type PlayerTradingCardData,
  type PlayerCardFrame,
} from "@/components/players/PlayerTradingCard";
import type { GameId } from "@/lib/ranking";
import { GAMES } from "@/lib/games";
import { getCanonicalOrigin, setJsonLd, setSeo } from "@/lib/seo";

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_external: boolean | null;
  is_verified: boolean;
  is_recruiting: boolean;
  region: string;
  rating: number;
  memberCount: number;
  primary_color: string;
  integrated_games?: any | null;
}

type PlayerProfile = PlayerTradingCardData & {
  player_card_frame_id?: string | null;
  frame?: PlayerCardFrame | null;
  verified?: boolean;
};

const Teams = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"players" | "explore">("explore");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [teamGameFilter, setTeamGameFilter] = useState<string>("all");
  const [playerGameFilter, setPlayerGameFilter] = useState<string>("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  const rtRefetchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([fetchTeams(), fetchPlayers()]).finally(() => setLoading(false));

    setSeo({
      title: "Equipes • Tornefy",
      description:
        "Explore equipes competitivas, encontre jogadores disponíveis e filtre por jogo, função e recrutamento no Tornefy.",
      canonical: getCanonicalOrigin() + "/equipes",
    });

    const origin = getCanonicalOrigin();
    setJsonLd("breadcrumbs-equipes", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: origin + "/" },
        { "@type": "ListItem", position: 2, name: "Equipes", item: origin + "/equipes" },
      ],
    });

    const schedule = () => {
      if (rtRefetchTimeoutRef.current) window.clearTimeout(rtRefetchTimeoutRef.current);
      rtRefetchTimeoutRef.current = window.setTimeout(async () => {
        await Promise.all([fetchTeams(), fetchPlayers()]);
      }, 300);
    };

    const channel = supabase
      .channel("rt-teams-and-players")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, schedule)
      .subscribe();

    return () => {
      if (rtRefetchTimeoutRef.current) window.clearTimeout(rtRefetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTeamsAndPlayers();
  }, [teams, players, searchTerm, typeFilter, recruitingOnly, viewMode, positionFilter, teamGameFilter, playerGameFilter, availableOnly]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(
          `
          *,
          team_members(count)
        `
        )
        // show only real teams; older rows may have is_external = NULL
        .or("is_external.is.null,is_external.eq.false")
        .order("rating", { ascending: false });

      if (error) throw error;

      const teamsWithCount = data?.map((team: any) => ({
        ...team,
        memberCount: team.team_members?.[0]?.count || 0,
        primary_color: team.primary_color || null,
      })) as Team[];

      const verifiedMap = await fetchVerifiedMap(
        "team",
        (teamsWithCount || []).map((t) => String(t.id))
      );

      const merged = (teamsWithCount || []).map((t) => ({
        ...t,
        // keep legacy flag working, but prefer new model
        is_verified: !!(t.is_verified || verifiedMap.get(String(t.id))),
      }));

      setTeams(merged || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchPlayers = async () => {
    try {
      setPlayersLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        // NOTE: player_card_frame_id is new; query via raw string.
        .select(
          "id, username, full_name, avatar_url, player_card_frame_id, player_function, available_for_team"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const profs = (data || []) as Array<{
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
        player_card_frame_id?: string | null;
        player_function?: string | null;
        available_for_team?: boolean | null;
      }>;

      const ids = profs.map((p) => p.id).filter(Boolean);

      const verifiedPlayers = await fetchVerifiedMap("user", ids);

      // Team mini info
      const teamByUser = new Map<
        string,
        {
          id: string;
          name: string | null;
          tag: string | null;
          logo_url: string | null;
          primary_color: string | null;
        }
      >();

      if (ids.length) {
        const { data: memberRows } = await (supabase as any)
          .from("team_members")
          .select("user_id, created_at, teams(id, name, tag, logo_url, primary_color)")
          .in("user_id", ids)
          .order("created_at", { ascending: true });
        (memberRows || []).forEach((row: any) => {
          const uid = row.user_id as string | null;
          if (!uid || teamByUser.has(uid)) return;
          if (!row.teams) return;
          teamByUser.set(uid, {
            id: row.teams.id,
            name: row.teams.name ?? null,
            tag: row.teams.tag ?? null,
            logo_url: row.teams.logo_url ?? null,
            primary_color: row.teams.primary_color ?? null,
          });
        });
      }

      // Active season (for rank cards)
      let seasonId = activeSeasonId;
      if (!seasonId) {
        const { data: seasons } = await supabase
          .from("ranking_seasons")
          .select("id, start_at, end_at")
          .order("start_at", { ascending: false });
        const now = Date.now();
        const rows = (seasons || []) as Array<{ id: string; start_at: string; end_at: string | null }>;
        const active = rows.find((s) => {
          const start = new Date(s.start_at).getTime();
          const end = s.end_at ? new Date(s.end_at).getTime() : Number.POSITIVE_INFINITY;
          return now >= start && now < end;
        });
        seasonId = active?.id || rows[0]?.id || null;
        setActiveSeasonId(seasonId);
      }

      // Frames
      const frameIds = Array.from(
        new Set(
          profs
            .map((p) => (p as any).player_card_frame_id as string | null)
            .filter((x): x is string => typeof x === "string" && x.length > 0)
        )
      );
      const frameById = new Map<string, PlayerCardFrame>();
      if (frameIds.length) {
        const { data: frames } = await supabase
          .from("player_card_frames")
          .select("id, slug, name, rarity, accent_hsl, border_hsl, background_hsl, meta")
          .in("id", frameIds);
        (frames || []).forEach((f: any) => frameById.set(String(f.id), f as PlayerCardFrame));
      }

      // Best game per user (by season points)
      const bestByUser = new Map<string, { gameId: string; points: number }>();
      if (seasonId && ids.length) {
        const { data: seasonPoints } = await supabase
          .from("player_season_points")
          .select("user_id, game_id, points")
          .eq("season_id", seasonId)
          .in("user_id", ids)
          .order("points", { ascending: false });
        (seasonPoints || []).forEach((r: any) => {
          const uid = String(r.user_id);
          if (bestByUser.has(uid)) return;
          bestByUser.set(uid, { gameId: String(r.game_id), points: Number(r.points ?? 0) });
        });
      }

      // Rank maps (top 500 leaderboard per best-game)
      const games = Array.from(new Set(Array.from(bestByUser.values()).map((v) => v.gameId))).slice(
        0,
        6
      );

      const rankByUser = new Map<string, { points: number; position: number | null; gameId: string }>(); // uid ->
      if (seasonId && games.length) {
        await Promise.all(
          games.map(async (g) => {
            const { data: lb } = await supabase
              .from("player_season_points")
              .select("user_id, points")
              .eq("season_id", seasonId)
              .eq("game_id", g)
              .order("points", { ascending: false })
              .limit(500);
            const rows = (lb || []) as Array<{ user_id: string; points: number }>;
            rows.forEach((r, idx) => {
              const best = bestByUser.get(r.user_id);
              if (!best || best.gameId !== g) return;
              if (rankByUser.has(r.user_id)) return;
              rankByUser.set(r.user_id, { points: r.points ?? 0, position: idx + 1, gameId: g });
            });
          })
        );
      }

      setPlayers(
        profs.map((p) => {
          const best = bestByUser.get(p.id);
          const gameId = (best?.gameId ?? null) as GameId | string | null;
          const rankRow = seasonId && p.id ? rankByUser.get(p.id) : null;
          return {
            ...p,
            function: (p as any).player_function ?? null,
            available_for_team: (p as any).available_for_team ?? null,
            game_id: gameId,
            team: teamByUser.get(p.id) ?? null,
            rank:
              seasonId && rankRow
                ? {
                    seasonId,
                    gameId: rankRow.gameId,
                    points: rankRow.points,
                    position: rankRow.position,
                  }
                : null,
            player_card_frame_id: (p as any).player_card_frame_id ?? null,
            // convenience for rendering
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            frame: frameById.get(String((p as any).player_card_frame_id || "")) || null,
            verified: !!verifiedPlayers.get(String(p.id)),
          } satisfies PlayerProfile;
        })
      );
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setPlayersLoading(false);
    }
  };

  const filterTeamsAndPlayers = () => {
    // Teams
    let filteredT = [...teams];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredT = filteredT.filter(
        (team) =>
          team.name.toLowerCase().includes(term) ||
          team.tag.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== "all") {
      filteredT = filteredT.filter((team) => team.is_verified);
    }

    if (recruitingOnly) {
      filteredT = filteredT.filter((team) => team.is_recruiting);
    }

    if (viewMode === "explore" && teamGameFilter !== "all") {
      filteredT = filteredT.filter((t) => {
        const arr = Array.isArray((t as any).integrated_games) ? (t as any).integrated_games : [];
        return arr.includes(teamGameFilter);
      });
    }

    setFilteredTeams(filteredT);

    // Players
    let filteredP = [...players];

    if (viewMode === "players" && positionFilter !== "all") {
      const target = positionFilter.toLowerCase();
      filteredP = filteredP.filter((p) => (p.function || "").toLowerCase() === target);
    }

    if (viewMode === "players" && playerGameFilter !== "all") {
      filteredP = filteredP.filter((p) => String(p.game_id || "") === playerGameFilter);
    }

    if (viewMode === "players" && availableOnly) {
      filteredP = filteredP.filter((p) => !!p.available_for_team && !p.team);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredP = filteredP.filter((p) => {
        const uname = (p.username || "").toLowerCase();
        const fname = (p.full_name || "").toLowerCase();
        const tname = (p.team?.name || "").toLowerCase();
        const ttag = (p.team?.tag || "").toLowerCase();
        const func = (p.function || "").toLowerCase();
        return (
          uname.includes(term) ||
          fname.includes(term) ||
          tname.includes(term) ||
          ttag.includes(term) ||
          func.includes(term)
        );
      });
    }
    setFilteredPlayers(filteredP);
  };

  if (loading) {
    return (
      <MainLayout>
        <header className="relative py-14 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/16 via-transparent to-transparent" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-2">
              <Skeleton className="h-10 w-44" />
            </div>
            <Skeleton className="h-4 w-72 mx-auto" />
          </div>
        </header>

        <main className="container mx-auto px-4 pb-10">
          <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-40" />
          </section>

          <section className="mb-8 bg-card/50 border border-border rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 md:gap-4 items-center">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-44" />
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <header className="relative py-14 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/16 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
              Equipes
            </h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Explore as melhores equipes competitivas da plataforma
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-10">
        {/* Top bar */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="bg-card/50">
              <TabsTrigger
                value="players"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Jogadores
              </TabsTrigger>
              <TabsTrigger
                value="explore"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Explorar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-sm text-muted-foreground md:text-right">
            {viewMode === "players"
              ? `${filteredPlayers.length} jogador${filteredPlayers.length !== 1 ? "es" : ""}`
              : `${filteredTeams.length} equipe${filteredTeams.length !== 1 ? "s" : ""}`}
          </p>
        </section>

        {/* Filters */}
        <section className="mb-8 bg-card/50 border border-border rounded-xl p-4">
          <div
            className={
              "grid grid-cols-1 gap-3 md:gap-4 items-center " +
              (viewMode === "players"
                ? "md:grid-cols-[1fr_180px_180px_auto_auto]"
                : "md:grid-cols-[1fr_180px_180px_auto]")
            }
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={
                  viewMode === "players" ? "Buscar jogador, @, função ou time..." : "Buscar por nome ou tag..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/40"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full bg-background/40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="verified">Verificadas</SelectItem>
              </SelectContent>
            </Select>

            {viewMode === "players" ? (
              <>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full bg-background/40">
                    <SelectValue placeholder="Posição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="rush">Rush</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                    <SelectItem value="capitão">Capitão</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={playerGameFilter} onValueChange={setPlayerGameFilter}>
                  <SelectTrigger className="w-full bg-background/40">
                    <SelectValue placeholder="Jogo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {GAMES.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <Select value={teamGameFilter} onValueChange={setTeamGameFilter}>
                <SelectTrigger className="w-full bg-background/40">
                  <SelectValue placeholder="Jogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {GAMES.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-2 justify-between md:justify-start">
              <Label htmlFor="recruiting" className="text-sm whitespace-nowrap">
                Só recrutando
              </Label>
              <Switch
                id="recruiting"
                checked={recruitingOnly}
                onCheckedChange={setRecruitingOnly}
              />
            </div>

            {viewMode === "players" && (
              <div className="flex items-center gap-2 justify-between md:justify-start">
                <Label htmlFor="available" className="text-sm whitespace-nowrap">
                  Só disponíveis
                </Label>
                <Switch
                  id="available"
                  checked={availableOnly}
                  onCheckedChange={setAvailableOnly}
                />
              </div>
            )}
          </div>
        </section>

        {/* Content */}
        {viewMode === "players" ? (
          playersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 justify-items-center">
              {Array.from({ length: 12 }).map((_, i) => (
                <PlayerTradingCardSkeleton key={i} className="w-full max-w-[232px]" />
              ))}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold mb-2">Nenhum jogador encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar a busca</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 justify-items-center">
              {filteredPlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="text-left flex"
                  onClick={() => navigate(`/profile/${p.id}`)}
                >
                  <PlayerTradingCard player={p} frame={p.frame} />
                </button>
              ))}
            </div>
          )
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold mb-2">Nenhuma equipe encontrada</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  style={
                    {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ["--team-primary" as any]:
                        (team.primary_color ? hexToHslTriplet(team.primary_color as any) : null) ||
                        "var(--primary)",
                    } as React.CSSProperties
                  }
                >
              <Card
                  className={
                    "overflow-hidden bg-card border-border transition-all cursor-pointer group " +
                    "hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 " +
                    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] motion-reduce:transform-none " +
                    "border-t-[3px] border-t-[hsl(var(--team-primary))]"
                  }
                onClick={() => navigate(`/team/${team.id}`)}
              >
                {/* Banner */}
                <div
                  className="h-24 relative"
                  style={{
                    background: team.banner_url
                      ? `url(${team.banner_url}) center/cover`
                        : `linear-gradient(135deg, hsl(var(--team-primary) / 0.55) 0%, hsl(var(--team-primary) / 0.18) 100%)`,
                  }}
                >
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {team.is_verified && (
                      <Badge className="bg-card/80 text-foreground border-border text-xs backdrop-blur-sm">
                        <TeamVerifiedBadge variant="icon" size="sm" />
                        Verificada
                      </Badge>
                    )}
                    {team.is_recruiting && (
                      <Badge className="bg-primary/90 text-primary-foreground border-0 text-xs">
                        <UserPlus className="w-3 h-3 mr-1" />
                        Recrutando
                      </Badge>
                    )}
                  </div>

                  {/* Logo */}
                  <div className="absolute -bottom-8 left-4">
                    <div className="w-16 h-16 rounded-lg bg-card border-2 border-background overflow-hidden flex items-center justify-center shadow-lg">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center bg-background/40">
                          <DefaultAvatarMark className="h-7 w-7 text-muted-foreground" title={`Logo padrão da equipe ${team.name}`} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="pt-10 pb-4 px-4">
                    <h3 className="font-black uppercase tracking-tight text-lg group-hover:text-primary transition-colors line-clamp-1">
                    {team.name}
                  </h3>
                  <p className="text-muted-foreground text-sm">[{team.tag}]</p>

                  {team.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {team.bio}
                    </p>
                  )}

                  <IntegratedGamesChips
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    gameIds={(team as any).integrated_games}
                    className="mt-3"
                    variant="icons"
                  />

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">{team.memberCount} membros</span>
                    <Badge variant="outline" className="text-xs">
                      {team.region || "BR"}
                    </Badge>
                  </div>
                </div>
              </Card>
                </div>
            ))}
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default Teams;
