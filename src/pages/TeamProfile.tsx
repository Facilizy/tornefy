import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Trophy, 
  Gamepad2, 
  Award, 
  MapPin, 
  Monitor,
  Settings,
  ArrowLeft,
  Crown,
  Link2Off,
  Instagram,
  Youtube,
  Twitter,
  MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import TeamBadges from "@/components/TeamBadges";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import TeamTagBadge from "@/components/TeamTagBadge";
import LiveNowSection from "@/components/twitch/LiveNowSection";
import { SocialLinksChips } from "@/components/SocialLinksChips";
import { IntegratedGamesChips } from "@/components/IntegratedGamesChips";
import { hexToHslTriplet } from "@/lib/color";
import { TeamProfileSkeleton } from "@/components/skeletons/TeamProfileSkeleton";
import { PlayerTradingCardSkeleton } from "@/components/skeletons/PlayerTradingCardSkeleton";
import {
  PlayerTradingCard,
  type PlayerTradingCardData,
  type PlayerCardFrame,
} from "@/components/players/PlayerTradingCard";
import type { GameId } from "@/lib/ranking";

interface TeamMember {
  id: string;
  player_name: string;
  game_id: string;
  discord: string | null;
  function: string;
  user_id?: string | null;
  line_id?: string | null;
  team_lines?: { id: string; name: string } | null;
}

const TeamProfile = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamLines, setTeamLines] = useState<Array<{ id: string; name: string }>>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    kills: 0,
    firstPlaces: 0,
    bestPosition: "—",
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterLine, setRosterLine] = useState<string>("all");
  const [rosterFunction, setRosterFunction] = useState<string>("all");

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [rosterEnrichLoading, setRosterEnrichLoading] = useState(false);
  const [profileByUserId, setProfileByUserId] = useState<
    Map<string, { id: string; username: string | null; full_name: string | null; avatar_url: string | null; player_card_frame_id?: string | null }>
  >(new Map());
  const [frameById, setFrameById] = useState<Map<string, PlayerCardFrame>>(new Map());
  const [rankByUserAndGame, setRankByUserAndGame] = useState<
    Map<string, { seasonId: string; gameId: string; points: number; position: number | null }>
  >(new Map());

  // Derived (must be before any early returns)
  const teamPrimaryTriplet =
    (team?.primary_color ? hexToHslTriplet(team.primary_color as string) : null) ||
    "var(--primary)";

  const memberUserIds = members
    .map((m) => m.user_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const linesWithMembers = useMemo(() => {
    const byLine = new Map<string, TeamMember[]>();
    members.forEach((m) => {
      const key = m.line_id || "__main__";
      const arr = byLine.get(key) || [];
      arr.push(m);
      byLine.set(key, arr);
    });

    const ordered = [
      ...teamLines.map((l) => ({
        id: l.id,
        name: l.name,
        members: byLine.get(l.id) || [],
      })),
    ];

    const mainMembers = byLine.get("__main__") || [];
    if (mainMembers.length > 0 || ordered.length === 0) {
      ordered.unshift({ id: "__main__", name: "MAIN", members: mainMembers });
    }

    return ordered.filter((l) => l.members.length > 0 || l.id === "__main__");
  }, [members, teamLines]);

  useEffect(() => {
    if (teamId) {
      fetchTeam();
      checkOwnership();
    }
  }, [teamId]);

  const checkOwnership = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: teamData } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single();
    
    setIsOwner(teamData?.owner_id === session.user.id);
  };

  const fetchTeam = async () => {
    try {
      setRosterEnrichLoading(true);
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch team badges
      const { data: badgesData } = await supabase
        .from("team_badges")
        .select("*")
        .eq("team_id", teamId);
      
      setBadges(badgesData || []);

      const [{ data: linesData }, { data: membersData }] = await Promise.all([
        supabase
          .from("team_lines")
          .select("id, name")
          .eq("team_id", teamId)
          .order("created_at", { ascending: true }),
        supabase
        .from("team_members")
        .select("*, team_lines(id, name)")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true }),
      ]);

      setTeamLines((linesData || []) as any);

      setMembers(membersData || []);

      // Load profiles for linked members (to render avatar/@ + frame)
      const userIds = (membersData || [])
        .map((m: any) => m.user_id)
        .filter((id: any): id is string => typeof id === "string" && id.length > 0);

      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          // NOTE: player_card_frame_id is new; query via raw string.
          .select("id, username, full_name, avatar_url, player_card_frame_id")
          .in("id", userIds);
        const map = new Map<string, any>();
        (profs || []).forEach((p: any) => map.set(String(p.id), p));
        setProfileByUserId(map);

        const fIds = Array.from(
          new Set(
            (profs || [])
              .map((p: any) => p.player_card_frame_id as string | null)
              .filter((x): x is string => typeof x === "string" && x.length > 0)
          )
        );
        if (fIds.length) {
          const { data: frames } = await supabase
            .from("player_card_frames")
            .select("id, slug, name, rarity, accent_hsl, border_hsl, background_hsl, meta")
            .in("id", fIds);
          const fm = new Map<string, PlayerCardFrame>();
          (frames || []).forEach((f: any) => fm.set(String(f.id), f as PlayerCardFrame));
          setFrameById(fm);
        } else {
          setFrameById(new Map());
        }
      } else {
        setProfileByUserId(new Map());
        setFrameById(new Map());
      }

      // Active season + ranks (for patente/pontos/posição)
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

      const games = Array.from(
        new Set(
          (membersData || [])
            .map((m: any) => m.game_id)
            .filter((g: any): g is string => typeof g === "string" && g.length > 0)
        )
      ).slice(0, 6);

      const ranks = new Map<string, { seasonId: string; gameId: string; points: number; position: number | null }>();
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
              const key = `${r.user_id}::${g}`;
              ranks.set(key, {
                seasonId,
                gameId: g,
                points: r.points ?? 0,
                position: idx + 1,
              });
            });
          })
        );
      }
      setRankByUserAndGame(ranks);

      const { data: registrations } = await supabase
        .from("training_registrations")
        .select(`
          *,
          trainings (*)
        `)
        .eq("team_id", teamId)
        .order("registered_at", { ascending: false });

      setHistory(registrations || []);

      // Stats: scrims jogadas, kills totais e quantas vezes ficou em 1 lugar
      const { data: matchScores } = await supabase
        .from("training_match_scores")
        .select("match_id, kills, position")
        .eq("team_id", teamId);

      const uniqueMatches = new Set<string>();
      let kills = 0;
      let firstPlaces = 0;
      let bestPos: number | null = null;

      (matchScores || []).forEach((row: any) => {
        const mId = row.match_id as string | null;
        if (mId) uniqueMatches.add(mId);
        const k = Number(row.kills ?? 0);
        kills += Number.isFinite(k) ? k : 0;
        const pos = row.position == null ? null : Number(row.position);
        if (pos === 1) firstPlaces += 1;
        if (typeof pos === "number" && Number.isFinite(pos)) {
          bestPos = bestPos == null ? pos : Math.min(bestPos, pos);
        }
      });

      const totalMatches = uniqueMatches.size || (registrations?.length || 0);
      setStats({
        totalMatches,
        kills,
        firstPlaces,
        bestPosition: bestPos == null ? "—" : `#${bestPos}`,
      });

    } catch (error) {
      toast.error("Equipe não encontrada");
      navigate("/equipes");
    } finally {
      setRosterEnrichLoading(false);
      setLoading(false);
    }
  };

  const getFunctionBadge = (func: string) => {
    switch (func) {
      case "CAPITÃO":
        return "bg-primary/10 text-primary border-primary/30";
      case "SUPORTE":
        return "bg-secondary text-secondary-foreground border-border";
      case "RUSH":
        return "bg-accent text-accent-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return <TeamProfileSkeleton />;
  }

  if (!team) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Equipe não encontrada</h1>
          <Button onClick={() => navigate("/equipes")}>Ver Equipes</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div
        style={{
          // Tailwind-friendly triplet ("H S% L%") or var(--primary)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["--team-primary" as any]: teamPrimaryTriplet,
        }}
      >
        {/* Banner */}
        <div
          className="relative h-52 md:h-72 overflow-hidden"
          style={{
            background: team.banner_url
              ? `url(${team.banner_url}) center/cover`
              : `linear-gradient(135deg, hsl(var(--team-primary) / 0.55) 0%, hsl(var(--team-primary) / 0.16) 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background/0 via-background/50 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

      <div className="container mx-auto px-4 -mt-24 md:-mt-28 relative z-10">
        {/* Team Header */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Left: Logo & Info */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Logo */}
              <div className="w-28 h-28 rounded-2xl border-2 bg-card overflow-hidden flex items-center justify-center shadow-xl border-[hsl(var(--team-primary)/0.35)]">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-[hsl(var(--team-primary))]">
                    {team.tag?.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black uppercase">{team.name}</h1>
                  <Badge variant="outline" className="uppercase text-sm">
                    [{team.tag}]
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {team.is_verified && (
                    <span className="inline-flex items-center gap-2">
                      <VerifiedBadge variant="pill" />
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {members.length} membros
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {team.region || "BR"}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Monitor className="w-4 h-4" />
                    {team.platform || "PC"}
                  </span>
                </div>

                {team.bio && (
                  <p className="text-muted-foreground mb-3">{team.bio}</p>
                )}

                <IntegratedGamesChips
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  gameIds={(team as any)?.integrated_games}
                  className="mb-3"
                  variant="icons"
                  size="md"
                />

                <SocialLinksChips links={team} />

                {badges.length > 0 && (
                  <div className="mt-3">
                    <TeamBadges badges={badges} compact />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Summary Card (sem T-Rating) */}
          <Card
            className="w-full lg:w-80 p-4 border-2 bg-card/60 backdrop-blur border-[hsl(var(--team-primary)/0.25)]"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Resumo</p>
                <p className="text-xl font-black uppercase tracking-tight">Performance</p>
              </div>
              <div className="h-12 w-24 rounded-xl border border-border bg-background/40 flex items-center justify-center text-xs text-muted-foreground">
                Patente
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-border bg-background/30 p-2">
                <p className="text-[11px] text-muted-foreground">Scrims</p>
                <p className="text-lg font-black tabular-nums text-[hsl(var(--team-primary))]">
                  {stats.totalMatches}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/30 p-2">
                <p className="text-[11px] text-muted-foreground">Kills</p>
                <p className="text-lg font-black tabular-nums text-[hsl(var(--team-primary))]">
                  {stats.kills}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/30 p-2">
                <p className="text-[11px] text-muted-foreground">#1</p>
                <p className="text-lg font-black tabular-nums text-[hsl(var(--team-primary))]">
                  {stats.firstPlaces}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Melhor posição</span>
              <span className="font-semibold text-[hsl(var(--team-primary))]">
                {stats.bestPosition}
              </span>
            </div>
          </Card>
        </div>

        {/* Owner Banner */}
        {isOwner && (
          <Card className="p-4 mb-6 bg-primary/10 border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-primary" />
              <div>
                <p className="font-semibold">Você é o dono deste time</p>
                <p className="text-sm text-muted-foreground">Gerencie membros, configurações e convites</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/my-team")}>
                <Settings className="w-4 h-4 mr-2" />
                Gerenciar Time
              </Button>
            </div>
          </Card>
        )}

        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-4"
          onClick={() => navigate("/equipes")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Live now (Twitch) */}
        <LiveNowSection title="Ao vivo agora" userIds={memberUserIds} enableSelfSync={false} />

        {/* Tabs */}
        <Tabs defaultValue="roster" className="mb-12">
          <TabsList className="w-full max-w-md grid grid-cols-4 mb-8 bg-card/50">
            <TabsTrigger value="roster" className="flex items-center gap-1 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Equipes</span>
            </TabsTrigger>
            <TabsTrigger value="scrims" className="flex items-center gap-1 text-xs sm:text-sm">
              <Gamepad2 className="w-4 h-4" />
              <span className="hidden sm:inline">Scrims</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-1 text-xs sm:text-sm">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Sobre</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 text-xs sm:text-sm">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roster">
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold uppercase">Jogadores</h2>
                  <span className="text-sm text-muted-foreground">{members.length} membros</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-3">
                <Input
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Buscar jogador, @, função..."
                  className="bg-background/40"
                />

                <Select value={rosterLine} onValueChange={setRosterLine}>
                  <SelectTrigger className="bg-background/40">
                    <SelectValue placeholder="Line" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lines</SelectItem>
                    <SelectItem value="__main__">MAIN</SelectItem>
                    {teamLines.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={rosterFunction} onValueChange={setRosterFunction}>
                  <SelectTrigger className="bg-background/40">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as funções</SelectItem>
                    {Array.from(new Set(members.map((m) => m.function).filter(Boolean))).map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {linesWithMembers
                .filter((l) => (rosterLine === "all" ? true : l.id === rosterLine))
                .map((line) => (
                <Card
                  key={line.id}
                  className="p-4 bg-card/50 border border-[hsl(var(--team-primary)/0.18)]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border border-border bg-background/40 flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black uppercase tracking-wide">{line.name}</span>
                          {line.id === "__main__" ? (
                            <Badge className="bg-primary text-primary-foreground text-xs">Padrão</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">{line.members.length} jogadores</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 justify-items-center">
                    {rosterEnrichLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <PlayerTradingCardSkeleton key={i} className="w-full max-w-[232px]" />
                      ))
                    ) : null}

                    {line.members
                      .filter((m) => {
                        if (rosterFunction !== "all" && m.function !== rosterFunction) return false;
                        if (!rosterSearch.trim()) return true;
                        const term = rosterSearch.toLowerCase();
                        const prof = m.user_id ? profileByUserId.get(m.user_id) : null;
                        const name = (prof?.full_name || m.player_name || "").toLowerCase();
                        const uname = (prof?.username || "").toLowerCase();
                        const func = (m.function || "").toLowerCase();
                        return name.includes(term) || uname.includes(term) || func.includes(term);
                      })
                      .map((member) => {
                        if (rosterEnrichLoading) return null;
                        const prof = member.user_id ? profileByUserId.get(member.user_id) : null;
                        const frameId = prof?.player_card_frame_id ? String(prof.player_card_frame_id) : null;
                        const frame = frameId ? frameById.get(frameId) || null : null;

                        const rankKey = member.user_id ? `${member.user_id}::${member.game_id}` : null;
                        const rankRow = rankKey ? rankByUserAndGame.get(rankKey) : null;

                        const player: PlayerTradingCardData = {
                          id: member.user_id || member.id,
                          username: prof?.username ?? null,
                          full_name: prof?.full_name ?? member.player_name,
                          avatar_url: prof?.avatar_url ?? null,
                          function: member.function,
                          game_id: (member.game_id as any) as GameId,
                          team: {
                            id: team.id,
                            name: team.name ?? null,
                            tag: team.tag ?? null,
                            logo_url: team.logo_url ?? null,
                            primary_color: team.primary_color ?? null,
                          },
                          rank: rankRow
                            ? {
                                seasonId: rankRow.seasonId,
                                gameId: rankRow.gameId,
                                points: rankRow.points,
                                position: rankRow.position,
                              }
                            : null,
                        };

                        return (
                          <button
                            key={member.id}
                            type="button"
                            className="text-left flex"
                            onClick={() => {
                              if (member.user_id) navigate(`/profile/${member.user_id}`);
                            }}
                            disabled={!member.user_id}
                            title={!member.user_id ? "Jogador externo (sem perfil)" : undefined}
                          >
                            <PlayerTradingCard player={player} frame={frame} />
                          </button>
                        );
                      })}

                    {line.members.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nenhum membro nesta line</p>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}

              {members.length === 0 && (
                <Card className="p-8 bg-card/50 border-border text-center">
                  <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum membro cadastrado</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scrims">
            <div className="space-y-4">
              {history.filter(h => new Date(h.trainings.datetime) > new Date()).map((item) => (
                <Card
                  key={item.id}
                  className="p-4 bg-card/50 border-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/training/${item.trainings.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Gamepad2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.trainings.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.trainings.datetime), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{item.trainings.mode}</Badge>
                  </div>
                </Card>
              ))}

              {history.filter(h => new Date(h.trainings.datetime) > new Date()).length === 0 && (
                <Card className="p-8 bg-card/50 border-border text-center">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Sem scrims agendadas</h3>
                  <p className="text-muted-foreground">
                    Esta equipe não está inscrita em nenhuma scrim futura.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="about">
            <Card className="p-6 bg-card/50 border-border">
              <h3 className="font-bold mb-4">Sobre a Equipe</h3>
              {team.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{team.description}</p>
              ) : (
                <p className="text-muted-foreground">Nenhuma descrição disponível.</p>
              )}

              <div className="mt-6">
                <h4 className="font-semibold mb-3">Redes Sociais</h4>
                <SocialLinksChips links={team} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {history.filter(h => new Date(h.trainings.datetime) <= new Date()).map((item) => (
                <Card
                  key={item.id}
                  className="p-4 bg-card/50 border-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/training/${item.trainings.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.trainings.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.trainings.datetime), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{item.trainings.mode}</Badge>
                  </div>
                </Card>
              ))}

              {history.filter(h => new Date(h.trainings.datetime) <= new Date()).length === 0 && (
                <Card className="p-8 bg-card/50 border-border text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Sem histórico</h3>
                  <p className="text-muted-foreground">
                    Esta equipe ainda não participou de nenhuma scrim.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </MainLayout>
  );
};

export default TeamProfile;
