import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";
import TeamTagBadge from "@/components/TeamTagBadge";
import LiveNowSection from "@/components/twitch/LiveNowSection";
import { useOrganizerFollow } from "@/hooks/useOrganizerFollow";
import {
  Award,
  Calendar,
  Edit,
  Gamepad2,
  Monitor,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const GAME_LABELS: Record<string, string> = {
  free_fire: "Free Fire",
  blood_strike: "Blood Strike",
  farlight_84: "Farlight 84",
  prime_rush: "Prime Rush",
  battlefield_6: "Battlefield 6",
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const [isOrganizer, setIsOrganizer] = useState(false);
  const [organizerVerified, setOrganizerVerified] = useState(false);
  const [organizerTrainings, setOrganizerTrainings] = useState<any[]>([]);

  const [selfTwitchConnected, setSelfTwitchConnected] = useState(false);

  const [followedOrganizers, setFollowedOrganizers] = useState<
    Array<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null }>
  >([]);
  const [loadingFollowed, setLoadingFollowed] = useState(false);

  const follow = useOrganizerFollow(isOrganizer ? (userId || user?.id) : null);

  const [stats, setStats] = useState({
    totalScrims: 0,
    totalBadges: 0,
    unlockedBadges: 0,
    totalKills: 0,
    mvps: 0,
    kd: 0,
    achievements: [] as {
      id: string;
      name: string;
      description: string | null;
      progress: number;
      targetValue: number;
      unlocked: boolean;
    }[],
  });

  const [loading, setLoading] = useState(true);

  const [mainTeam, setMainTeam] = useState<
    { id: string; tag: string; primary_color: string | null } | null
  >(null);

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (isOwnProfile) fetchFollowedOrganizers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile, user?.id]);

  useEffect(() => {
    // Only the profile owner can sync; also avoid calling the sync function if Twitch isn't connected.
    if (!isOwnProfile) {
      setSelfTwitchConnected(false);
      return;
    }
    if (!profile?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("twitch_live_status")
          .select("twitch_login")
          .eq("user_id", profile.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        setSelfTwitchConnected(!!data?.twitch_login);
      } catch {
        if (!cancelled) setSelfTwitchConnected(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, profile?.id]);

  const checkUser = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    setUser(session?.user || null);

    // If no userId param, show current user's profile
    const targetUserId = userId || currentUserId;

    if (!targetUserId) {
      navigate("/auth");
      return;
    }

    setIsOwnProfile(currentUserId === targetUserId);

    try {
      const [profileData, roleRow] = await Promise.all([
        fetchProfile(targetUserId),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId)
          .eq("role", "organizer")
          .maybeSingle(),
      ]);

      setProfile(profileData);

      // Verifica se é organizador pela tabela user_roles OU pelo campo role na tabela profiles
      const organizerByRoleTable = !!roleRow.data;
      const organizerByProfileRole = profileData?.role === "organizer";
      const organizer = organizerByRoleTable || organizerByProfileRole;
      setIsOrganizer(organizer);

      if (organizer) {
        const trainings = await fetchOrganizerTrainings(targetUserId);
        setOrganizerTrainings(trainings);
        // Verificado se tiver 10+ treinos criados
        const organizerIsVerified = trainings.length >= 10;
        setOrganizerVerified(organizerIsVerified);
      } else {
        await fetchPlayerStats(targetUserId);
      }

      // refresh follow state/count when viewing organizer profile
      if (organizer) await follow.refetch();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao carregar perfil");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (error) throw error;
    return data;
  };

  const fetchOrganizerTrainings = async (uid: string) => {
    const { data, error } = await supabase
      .from("trainings")
      .select(
        `
        id,
        name,
        datetime,
        status,
        platform,
        mode,
        game,
        max_slots,
        banner_url,
        training_registrations(count)
      `
      )
      .eq("organizer_id", uid)
      .order("datetime", { ascending: false });

    if (error) throw error;

    return (data || []).map((t: any) => ({
      ...t,
      registrations: t.training_registrations?.[0]?.count || 0,
    }));
  };

  const fetchPlayerStats = async (uid: string) => {
    // Buscar times em que o jogador está cadastrado
    const { data: teamMembers, error: tmError } = await supabase
      .from("team_members")
      .select("id, team_id, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });

    if (tmError) throw tmError;

    const memberIds = (teamMembers || []).map((m: any) => m.id).filter(Boolean);
    const teamIds = Array.from(
      new Set((teamMembers || []).map((m: any) => m.team_id).filter(Boolean))
    );

    // Main team = oldest membership (first row due to ordering)
    const mainTeamId = (teamMembers || [])?.[0]?.team_id as string | undefined;
    if (mainTeamId) {
      const { data: t, error: tErr } = await supabase
        .from("teams")
        .select("id, tag, primary_color")
        .eq("id", mainTeamId)
        .maybeSingle();
      if (!tErr && t?.id) {
        setMainTeam({ id: t.id, tag: t.tag || "", primary_color: t.primary_color ?? null });
      } else {
        setMainTeam(null);
      }
    } else {
      setMainTeam(null);
    }

    let totalScrims = 0;

    if (teamIds.length > 0) {
      const { count: scrimsCount, error: regError } = await supabase
        .from("training_registrations")
        .select("*", { count: "exact", head: true })
        .in("team_id", teamIds);

      if (regError) throw regError;
      totalScrims = scrimsCount || 0;
    }

    let totalKills = 0;
    let mvps = 0;
    let kd = 0;

    if (memberIds.length > 0) {
      const { data: playerStats, error: psError } = await supabase
        .from("training_player_stats")
        .select("kills, is_mvp, match_id, team_member_id")
        .in("team_member_id", memberIds);

      if (psError) throw psError;

      const matchesPlayed = new Set<string>();

      (playerStats || []).forEach((s: any) => {
        totalKills += s.kills ?? 0;
        if (s.is_mvp) mvps += 1;
        if (s.match_id) matchesPlayed.add(s.match_id as string);
      });

      const scrimsFromStats = matchesPlayed.size;
      if (!totalScrims) totalScrims = scrimsFromStats;

      const denom = scrimsFromStats || totalScrims || 1;
      kd = totalKills / denom;
    }

    // Carregar conquistas do jogador
    const { data: userAchievements, error: uaError } = await supabase
      .from("user_achievements")
      .select("id, achievement_id, progress, unlocked_at")
      .eq("user_id", uid);

    if (uaError) throw uaError;

    let achievements: {
      id: string;
      name: string;
      description: string | null;
      progress: number;
      targetValue: number;
      unlocked: boolean;
    }[] = [];
    let totalBadges = 0;
    let unlockedBadges = 0;

    if (userAchievements && userAchievements.length > 0) {
      const achievementIds = userAchievements.map((ua: any) => ua.achievement_id);

      const { data: achievementsData, error: achError } = await supabase
        .from("achievements")
        .select("id, name, description, target_value")
        .in("id", achievementIds);

      if (achError) throw achError;

      const achById = new Map(
        (achievementsData || []).map((a: any) => [a.id, a])
      );

      achievements = userAchievements.map((ua: any) => {
        const ach = achById.get(ua.achievement_id);
        const target = ach?.target_value ?? 1;
        const progress = ua.progress ?? 0;
        const unlocked = !!ua.unlocked_at;

        if (ach) {
          totalBadges += 1;
          if (unlocked) unlockedBadges += 1;
        }

        return {
          id: ua.id,
          name: ach?.name || "Conquista",
          description: ach?.description || null,
          progress,
          targetValue: target,
          unlocked,
        };
      });
    }

    setStats({
      totalScrims,
      totalBadges,
      unlockedBadges,
      totalKills,
      mvps,
      kd,
      achievements,
    });
  };

  const fetchFollowedOrganizers = async () => {
    if (!user?.id) return;

    try {
      setLoadingFollowed(true);
      const { data: rows, error } = await supabase
        .from("organizer_follows")
        .select("organizer_id")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ids = (rows || []).map((r: any) => r.organizer_id).filter(Boolean);
      if (ids.length === 0) {
        setFollowedOrganizers([]);
        return;
      }

      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);

      if (pErr) throw pErr;

      // keep order of follow
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      setFollowedOrganizers(
        ids
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((p: any) => ({
            id: p.id,
            full_name: p.full_name ?? null,
            username: p.username ?? null,
            avatar_url: p.avatar_url ?? null,
          }))
      );
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingFollowed(false);
    }
  };

  const organizerSummary = useMemo(() => {
    const totalTrainings = organizerTrainings.length;
    const openTrainings = organizerTrainings.filter(
      (t) => t.status === "INSCRIÇÕES ABERTAS"
    ).length;
    const totalRegistrations = organizerTrainings.reduce(
      (acc, t) => acc + (t.registrations || 0),
      0
    );
    const liveTrainings = organizerTrainings.filter((t) => !!t.is_live).length;

    return { totalTrainings, openTrainings, totalRegistrations, liveTrainings };
  }, [organizerTrainings]);

  const organizerTopGames = useMemo(() => {
    const counts = new Map<string, number>();
    organizerTrainings.forEach((t) => {
      const g = t.game || "unknown";
      counts.set(g, (counts.get(g) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ id, label: GAME_LABELS[id] || id, count }));
  }, [organizerTrainings]);

  if (loading) {
    return (
      <MainLayout showUpcomingScrimWidget={false}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      {/* Banner */}
      <header className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 via-muted/10 to-primary/20 overflow-hidden">
        {profile?.banner_url && (
          <img
            src={profile.banner_url}
            alt={`Banner de ${profile.full_name || "perfil"}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </header>

      <main className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Header */}
        <section className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-8">
          <div className="w-32 h-32 rounded-lg border-4 border-primary/50 bg-card overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <User className="w-16 h-16 text-primary" />
            )}
          </div>

          <div className="flex-1 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black uppercase">
                  {profile?.full_name || "Usuário"}
                </h1>
                {!isOrganizer && mainTeam?.tag ? (
                  <TeamTagBadge tag={mainTeam.tag} primaryColor={mainTeam.primary_color} />
                ) : null}
                {isOrganizer && organizerVerified && (
                  <VerifiedBadge variant="pill" size="md" label="Organizador verificado" />
                )}
              </div>

              {profile?.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {isOrganizer ? "Perfil de organizador" : "Perfil de jogador"}
                </p>
                {isOrganizer ? (
                  <span className="text-xs text-muted-foreground">•</span>
                ) : null}
                {isOrganizer ? (
                  <span className="text-xs text-muted-foreground">
                    {follow.loading ? "—" : `${follow.followersCount} seguidor(es)`}
                  </span>
                ) : null}
              </div>
            </div>

            {isOwnProfile ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/invites")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Convites
                </Button>
                <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            ) : isOrganizer ? (
              <Button
                onClick={async () => {
                  try {
                    await follow.toggle();
                    toast.success(follow.isFollowing ? "Você deixou de seguir." : "Agora você está seguindo!");
                    if (isOwnProfile) fetchFollowedOrganizers();
                  } catch (e: any) {
                    toast.error(e?.message || "Erro ao atualizar follow");
                  }
                }}
                disabled={follow.loading}
                variant={follow.isFollowing ? "outline" : "default"}
              >
                {follow.isFollowing ? "Deixar de seguir" : "Seguir"}
              </Button>
            ) : null}
          </div>
        </section>

        {/* Live now (Twitch) */}
        {profile?.id ? (
          <LiveNowSection
            userIds={[profile.id]}
            enableSelfSync={!!isOwnProfile && selfTwitchConnected}
            intervalMs={3 * 60 * 1000}
          />
        ) : null}

        {isOrganizer ? (
          <section className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-card/50 border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{organizerSummary.totalTrainings}</p>
                    <p className="text-xs text-muted-foreground">Treinos criados</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{organizerSummary.openTrainings}</p>
                    <p className="text-xs text-muted-foreground">Abertos</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{organizerSummary.totalRegistrations}</p>
                    <p className="text-xs text-muted-foreground">Inscrições</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{organizerTopGames[0]?.label || "—"}</p>
                    <p className="text-xs text-muted-foreground">Jogo principal</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-card/50 border-border">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-bold uppercase">Treinos criados</h2>
                  <p className="text-sm text-muted-foreground">
                    Veja os treinos deste organizador e acesse a página de cada um.
                  </p>
                </div>
                {isOwnProfile && (
                  <Button onClick={() => navigate("/organizer")}>
                    Ir para o painel
                  </Button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {organizerTrainings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum treino criado ainda.
                  </p>
                ) : (
                  organizerTrainings.slice(0, 8).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate(`/training/${t.id}`)}
                      className="text-left"
                    >
                      <Card className="p-4 bg-background/50 border-border hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold uppercase line-clamp-1">{t.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(GAME_LABELS[t.game] || t.game) + " • " + (t.platform || "-") + " • " + (t.mode || "-")}
                            </p>
                          </div>
                          <TrainingStatusBadge status={t.status} />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {t.datetime ? new Date(t.datetime).toLocaleString("pt-BR") : "—"}
                          </span>
                          <span>
                            <span className="font-semibold">{t.registrations || 0}</span>/{t.max_slots}
                          </span>
                        </div>
                      </Card>
                    </button>
                  ))
                )}
              </div>

              {organizerTrainings.length > 8 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Mostrando 8 de {organizerTrainings.length} treinos.
                </p>
              )}
            </Card>
          </section>
        ) : (
          <section>
            {/* 'Organizadores que sigo' foi movido para a página /scrims */}
            <Tabs defaultValue="overview" className="mb-12">
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="scrims" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Scrims
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Estatísticas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card className="p-6 bg-card/50 border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold uppercase">Conquistas</h3>
                        <p className="text-sm text-muted-foreground">
                          {stats.unlockedBadges} de {stats.totalBadges} desbloqueadas
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-primary border border-primary/30 px-2 py-0.5 rounded">
                      {Math.round(
                        stats.totalBadges
                          ? (stats.unlockedBadges / stats.totalBadges) * 100
                          : 0
                      )}%
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.totalBadges
                        ? (stats.unlockedBadges / stats.totalBadges) * 100
                        : 0
                    }
                    className="h-1"
                  />
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 bg-card/50 border-border text-center">
                    <p className="text-2xl font-bold text-primary">{stats.totalScrims}</p>
                    <p className="text-sm text-muted-foreground">Scrims Jogadas</p>
                  </Card>
                  <Card className="p-4 bg-card/50 border-border text-center">
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-sm text-muted-foreground">Vitórias</p>
                  </Card>
                  <Card className="p-4 bg-card/50 border-border text-center">
                    <p className="text-2xl font-bold text-primary">0%</p>
                    <p className="text-sm text-muted-foreground">Winrate</p>
                  </Card>
                  <Card className="p-4 bg-card/50 border-border text-center">
                    <p className="text-2xl font-bold text-primary">{stats.unlockedBadges}</p>
                    <p className="text-sm text-muted-foreground">Badges</p>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="scrims">
                <Card className="p-8 bg-card/50 border-border text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Histórico de Scrims</h3>
                  <p className="text-muted-foreground">
                    {stats.totalScrims > 0
                      ? `${stats.totalScrims} scrims participadas`
                      : "Nenhuma scrim jogada ainda"}
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="stats">
                <Card className="p-8 bg-card/50 border-border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{stats.totalScrims}</p>
                      <p className="text-sm text-muted-foreground">Scrims Jogadas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{stats.totalKills}</p>
                      <p className="text-sm text-muted-foreground">Kills Totais</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{stats.kd.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">K/D médio</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{stats.mvps}</p>
                      <p className="text-sm text-muted-foreground">MVPs</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Conquistas
                  </h3>

                  {stats.achievements.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhuma conquista registrada ainda. Jogue scrims e acumule kills/MVPs
                      para começar a desbloquear conquistas.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.achievements.map((ach) => {
                        const percent = ach.targetValue
                          ? Math.min(100, (ach.progress / ach.targetValue) * 100)
                          : 0;
                        return (
                          <Card
                            key={ach.id}
                            className="p-4 bg-background/50 border-border flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{ach.name}</p>
                                {ach.description && (
                                  <p className="text-xs text-muted-foreground">{ach.description}</p>
                                )}
                              </div>
                              {ach.unlocked && (
                                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                  Desbloqueada
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={percent} className="h-1 flex-1" />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {ach.progress} / {ach.targetValue}
                              </span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        )}
      </main>
    </MainLayout>
  );
};

export default UserProfile;
