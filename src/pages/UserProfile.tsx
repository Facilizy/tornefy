import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { OrganizerBadge } from "@/components/OrganizerBadge";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";
import TeamTagBadge from "@/components/TeamTagBadge";
import LiveNowSection from "@/components/twitch/LiveNowSection";
import { PaymentComingSoon } from "@/components/payments/PaymentComingSoon";
import { useOrganizerFollow } from "@/hooks/useOrganizerFollow";
import {
  Award,
  Calendar,
  CheckCircle2,
  Edit,
  Gamepad2,
  Monitor,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getCanonicalOrigin, setSeo } from "@/lib/seo";
import type { GameId } from "@/lib/ranking";
import { SeasonRankCard } from "@/components/profile/SeasonRankCard";
import { ProfileRankingSelectors } from "@/components/profile/ProfileRankingSelectors";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSeasonSummaryCard } from "@/components/profile/ProfileSeasonSummaryCard";
import { ProfileTeamCard } from "@/components/profile/ProfileTeamCard";
import { ProfileSocialButtons } from "@/components/profile/ProfileSocialButtons";
import { getGameLabel, getGameLogo } from "@/lib/games";
import { MissionsTab, type MissionRow } from "@/components/profile/MissionsTab";
import { ProfileEmblemsCard } from "@/components/profile/ProfileEmblemsCard";
import { ProfilePreferredGamesCard } from "@/components/profile/ProfilePreferredGamesCard";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { UserProfileSkeleton } from "@/components/skeletons/UserProfileSkeleton";
import { ProfileGameStatCardSkeleton } from "@/components/skeletons/ProfileGameStatCardSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVerifiedEntity } from "@/hooks/useVerifiedEntities";
import { PlayerVerifiedBadge } from "@/components/PlayerVerifiedBadge";
import { hexToHslTriplet } from "@/lib/color";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

function StatChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
      <span className="text-foreground/80">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <header className="relative overflow-hidden">
      <div className="relative h-[320px] md:h-[380px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-muted/10 to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-24 md:-mt-28 relative z-10">
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-2xl" />
            <div className="flex-1 w-full">
              <Skeleton className="h-8 w-64 max-w-full" />
              <Skeleton className="mt-2 h-4 w-36" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

const GAME_LABELS: Record<string, string> = {
  free_fire: "Free Fire",
  blood_strike: "Blood Strike",
  farlight_84: "Farlight 84",
  prime_rush: "Prime Rush",
  pubg_mobile: "PUBG Mobile",
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const [isOrganizer, setIsOrganizer] = useState(false);
  const [organizerVerified, setOrganizerVerified] = useState(false);
  const [organizerTrainings, setOrganizerTrainings] = useState<any[]>([]);

  const [organizerPlans, setOrganizerPlans] = useState<any[]>([]);
  const [organizerPlanCounts, setOrganizerPlanCounts] = useState<Record<string, number>>({});
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

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
    firstPlaces: 0,
    killsByMatch: [] as Array<{ label: string; kills: number; mvps: number }>,
    achievements: [] as {
      id: string; // user_achievements.id
      achievementId: string; // achievements.id
      name: string;
      description: string | null;
      progress: number;
      targetValue: number;
      unlocked: boolean;
      unlockedAt: string | null;
      claimedAt: string | null;
    }[],
    byGame: {} as Record<string, { scrims: number; kills: number; mvps: number; kd: number }>,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [scrimHistory, setScrimHistory] = useState<
    Array<{
      id: string;
      registered_at: string;
      slot_number: number | null;
      training: {
        id: string;
        name: string | null;
        datetime: string | null;
        game: string | null;
        status: string | null;
      } | null;
    }>
  >([]);

  const [mainTeam, setMainTeam] = useState<
    | {
      id: string;
      tag: string | null;
      name: string | null;
      primary_color: string | null;
      logo_url?: string | null;
      banner_url?: string | null;
      bio?: string | null;
      region?: string | null;
      discord_url?: string | null;
      twitter_url?: string | null;
      instagram_url?: string | null;
      youtube_url?: string | null;
      integrated_games?: unknown;
    }
    | null
  >(null);

  const selectedGame = (searchParams.get("game") || "free_fire") as GameId;
  const selectedSeasonId = searchParams.get("season");

  const targetUid = userId || user?.id || null;
  const { verified: playerVerified } = useVerifiedEntity("user", targetUid);

  const headerAccentA = useMemo(() => {
    // If player has a team, use the team color as accent.
    if (mainTeam?.primary_color) return hexToHslTriplet(mainTeam.primary_color) || "var(--primary)";
    return "var(--primary)";
  }, [mainTeam?.primary_color]);

  const headerAccentB = useMemo(() => {
    // secondary color is optional; if absent, reuse primary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secondary = (mainTeam as any)?.secondary_color as string | null | undefined;
    if (secondary) return hexToHslTriplet(secondary) || headerAccentA;
    return headerAccentA;
  }, [headerAccentA, mainTeam]);

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!profile?.id) return;
    const name = profile?.full_name || profile?.username || "Perfil";
    setSeo({
      title: `${name} — Tornefy`,
      description:
        "Veja estatísticas de scrims, kills e conquistas, além dos treinos criados por organizadores verificados.",
      canonical: getCanonicalOrigin() + (userId ? `/profile/${userId}` : "/profile"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    if (isOrganizer) return;
    // Recalcula ao alternar game/season via URL (ProfileRankingSelectors)
    fetchPlayerStats(profile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame, selectedSeasonId]);

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
      const [profileData, rolesRes] = await Promise.all([
        fetchProfile(targetUserId),
        (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId)
          .in("role", ["organizer", "organizer_verified"]),
      ]);

      setProfile(profileData);

      const rolesError = rolesRes?.error;
      const roles = (rolesRes?.data || []).map((r: any) => String(r.role));

      // Detecção resiliente (funciona para deslogado e para players vendo organizadores):
      // - `user_roles` costuma estar bloqueado por RLS para terceiros
      // - então usamos também sinais públicos: RPC is_organizer_verified + existência de treinos
      // - e, como último fallback, profiles.role (compat com projetos antigos)
      let organizer = false;
      let verifiedByRpc = false;

      // Público (funciona mesmo quando RLS bloqueia user_roles para terceiros)
      let organizerByRpc = false;
      try {
        const { data: oData } = await (supabase as any).rpc("is_organizer", { _user_id: targetUserId });
        organizerByRpc = !!oData;
      } catch {
        organizerByRpc = false;
      }

      try {
        const { data: vData } = await (supabase as any).rpc("is_organizer_verified", { _user_id: targetUserId });
        verifiedByRpc = !!vData;
      } catch {
        verifiedByRpc = false;
      }

      // Se conseguimos ler roles (ex.: vendo o próprio perfil), usamos também
      const organizerByRoles = !rolesError && (roles.includes("organizer") || roles.includes("organizer_verified"));
      const verifiedByRoles = !rolesError && roles.includes("organizer_verified");

      // Best-effort: tenta detectar se o usuário criou treinos.
      // Mesmo que select esteja restrito, `head: true` costuma ser mais permissivo em algumas configs.
      let organizerByTrainings = false;
      try {
        const { count, error: cErr } = await supabase
          .from("trainings")
          .select("id", { count: "exact", head: true })
          .eq("organizer_id", targetUserId);
        if (!cErr) organizerByTrainings = (count ?? 0) > 0;
      } catch {
        organizerByTrainings = false;
      }

      // Compat: profiles.role pode existir e ser público; não é fonte de autoridade,
      // mas ajuda a evitar cair no layout de jogador quando as outras leituras são bloqueadas.
      const organizerByProfileRole = String((profileData as any)?.role || "").toLowerCase() === "organizer";

      organizer = organizerByRoles || organizerByRpc || organizerByTrainings || verifiedByRpc || organizerByProfileRole;
      verifiedByRpc = verifiedByRoles || verifiedByRpc;

      setIsOrganizer(organizer);

      if (organizer) {
        const [trainings] = await Promise.all([
          fetchOrganizerTrainings(targetUserId),
          fetchOrganizerPlans(targetUserId),
        ]);
        setOrganizerTrainings(trainings);
        // Verificado por RPC (fallback se RLS bloqueou)
        const verifiedByMilestone = trainings.length >= 10;
        setOrganizerVerified(verifiedByRpc || verifiedByMilestone);
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

  const fetchOrganizerPlans = async (uid: string) => {
    try {
      setLoadingPlans(true);

      const [{ data: plans, error: plansErr }, { data: memberships, error: memErr }] = await Promise.all([
        supabase
          .from("organizer_subscription_plans")
          .select("id,name,description,benefits_text,monthly_fee_coins,period_days,max_subscribers,active")
          .eq("organizer_id", uid)
          .eq("active", true)
          .order("monthly_fee_coins", { ascending: true }),
        supabase
          .from("organizer_plan_memberships")
          .select("plan_id,current_period_end,status")
          .eq("organizer_id", uid)
          .eq("status", "active"),
      ]);

      if (plansErr) throw plansErr;
      if (memErr) throw memErr;

      const counts: Record<string, number> = {};
      (memberships || []).forEach((m: any) => {
        const end = m?.current_period_end ? new Date(String(m.current_period_end)).getTime() : 0;
        if (end && end > Date.now()) {
          const pid = String(m.plan_id || "");
          if (!pid) return;
          counts[pid] = (counts[pid] || 0) + 1;
        }
      });

      setOrganizerPlans(plans || []);
      setOrganizerPlanCounts(counts);
    } catch {
      setOrganizerPlans([]);
      setOrganizerPlanCounts({});
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchPlayerStats = async (uid: string) => {
    setStatsLoading(true);
    setStatsError(null);

    const fetchPublicCoreStats = async () => {
      try {
        const { data, error } = await (supabase as any).rpc("get_public_player_stats", {
          _user_id: uid,
        });
        if (error) throw error;
        const scrims = Number(data?.scrims ?? 0);
        const kills = Number(data?.kills ?? 0);
        const mvps = Number(data?.mvps ?? 0);
        return {
          scrims: Number.isFinite(scrims) ? scrims : 0,
          kills: Number.isFinite(kills) ? kills : 0,
          mvps: Number.isFinite(mvps) ? mvps : 0,
        };
      } catch {
        return null;
      }
    };

    try {
      // Logged-out mode: always use public RPC for core stats (avoids any RLS surprises).
      if (!user?.id) {
        const core = await fetchPublicCoreStats();
        const totalScrims = core?.scrims ?? 0;
        const totalKills = core?.kills ?? 0;
        const mvps = core?.mvps ?? 0;
        const kd = totalScrims ? totalKills / totalScrims : 0;

        setStats((prev) => ({
          ...prev,
          totalScrims,
          totalKills,
          mvps,
          kd,
        }));
        return;
      }

      // Buscar times em que o jogador está cadastrado
      const { data: teamMembers, error: tmError } = await supabase
        .from("team_members")
        .select("id, team_id, game_id, line_id, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: true });

      if (tmError) throw tmError;

      const memberIds = (teamMembers || []).map((m: any) => m.id).filter(Boolean);
      const lineIds = (teamMembers || [])
        .map((m: any) => m?.line_id)
        .filter(Boolean)
        .map(String);
      const memberGameById = new Map<string, string>();
      (teamMembers || []).forEach((m: any) => {
        if (m?.id && m?.game_id) memberGameById.set(String(m.id), String(m.game_id));
      });
      const teamIds = Array.from(
        new Set((teamMembers || []).map((m: any) => m.team_id).filter(Boolean))
      );

      // Main team = oldest membership (first row due to ordering)
      const mainTeamId = (teamMembers || [])?.[0]?.team_id as string | undefined;
      if (mainTeamId) {
        // NOTE: `youtube_url` is a recently added column; we query via `any` to avoid stale generated types.
        const { data: t, error: tErr } = await (supabase as any)
          .from("teams")
          .select(
            "id, tag, name, primary_color, logo_url, banner_url, bio, region, discord_url, twitter_url, instagram_url, youtube_url, integrated_games"
          )
          .eq("id", mainTeamId)
          .maybeSingle();
        if (!tErr && t?.id) {
          setMainTeam({
            id: t.id,
            tag: t.tag ?? null,
            name: t.name ?? null,
            primary_color: t.primary_color ?? null,
            logo_url: t.logo_url ?? null,
            banner_url: t.banner_url ?? null,
            bio: t.bio ?? null,
            region: t.region ?? null,
            discord_url: t.discord_url ?? null,
            twitter_url: t.twitter_url ?? null,
            instagram_url: t.instagram_url ?? null,
            youtube_url: t.youtube_url ?? null,
            integrated_games: t.integrated_games ?? null,
          });
        } else {
          setMainTeam(null);
        }
      } else {
        setMainTeam(null);
      }

      // Season window (opcional): filtra por data de criação do match
      let seasonStart: number | null = null;
      let seasonEnd: number | null = null;
      if (selectedSeasonId) {
        const { data: sRow } = await supabase
          .from("ranking_seasons")
          .select("start_at, end_at")
          .eq("id", selectedSeasonId)
          .maybeSingle();
        if (sRow?.start_at) seasonStart = new Date(sRow.start_at).getTime();
        if (sRow?.end_at) seasonEnd = new Date(sRow.end_at).getTime();
      }

      // Stats reais via training_player_stats (jogador) + training_match_scores (#1 do time nos matches que ele jogou)
      let totalScrims = 0;
      let totalKills = 0;
      let mvps = 0;
      let firstPlaces = 0;

      const matchesPlayed = new Set<string>();
      const killsByMatch = new Map<string, { kills: number; mvps: number }>();

      const byGameAgg = new Map<string, { kills: number; mvps: number; matches: Set<string> }>();

      if (memberIds.length > 0) {
        const { data: playerStats, error: psError } = await supabase
          .from("training_player_stats")
          .select("kills, is_mvp, match_id, team_member_id")
          .in("team_member_id", memberIds);

        if (psError) throw psError;

        const allMatchIds = Array.from(
          new Set((playerStats || []).map((s: any) => s.match_id).filter(Boolean).map(String))
        );

        const matchMeta = new Map<string, { createdAtMs: number | null; matchNumber: number | null }>();
        if (allMatchIds.length) {
          const { data: matchRows, error: mErr2 } = await supabase
            .from("training_matches")
            .select("id, created_at, match_number")
            .in("id", allMatchIds);
          if (mErr2) throw mErr2;
          (matchRows || []).forEach((m: any) => {
            matchMeta.set(String(m.id), {
              createdAtMs: m?.created_at ? new Date(m.created_at).getTime() : null,
              matchNumber: m?.match_number != null ? Number(m.match_number) : null,
            });
          });
        }

        const isMatchInSeason = (matchId: string) => {
          if (!seasonStart) return true;
          const meta = matchMeta.get(matchId);
          const t = meta?.createdAtMs;
          if (!t) return true;
          const end = seasonEnd ?? Number.POSITIVE_INFINITY;
          return t >= seasonStart && t < end;
        };

        (playerStats || []).forEach((s: any) => {
          const matchId = s.match_id ? String(s.match_id) : null;
          if (!matchId) return;
          if (!isMatchInSeason(matchId)) return;

          const kills = Number(s.kills ?? 0);
          const isMvp = !!s.is_mvp;
          const memberId = s.team_member_id ? String(s.team_member_id) : null;
          const g = memberId ? memberGameById.get(memberId) : null;

          // Per-game aggregates (para cards por jogo)
          if (g) {
            const cur = byGameAgg.get(g) || { kills: 0, mvps: 0, matches: new Set<string>() };
            cur.kills += Number.isFinite(kills) ? kills : 0;
            if (isMvp) cur.mvps += 1;
            cur.matches.add(matchId);
            byGameAgg.set(g, cur);
          }

          // Selected game aggregates (números grandes + chart)
          if (!g || g === selectedGame) {
            totalKills += Number.isFinite(kills) ? kills : 0;
            if (isMvp) mvps += 1;
            matchesPlayed.add(matchId);

            const prev = killsByMatch.get(matchId) || { kills: 0, mvps: 0 };
            prev.kills += Number.isFinite(kills) ? kills : 0;
            if (isMvp) prev.mvps += 1;
            killsByMatch.set(matchId, prev);
          }
        });

        totalScrims = matchesPlayed.size;
      }

      if (mainTeamId && matchesPlayed.size > 0) {
        const matchIds = Array.from(matchesPlayed);
        const { data: scoreRows, error: msError } = await supabase
          .from("training_match_scores")
          .select("match_id, position")
          .eq("team_id", mainTeamId)
          .in("match_id", matchIds);

        if (msError) throw msError;
        (scoreRows || []).forEach((r: any) => {
          if (Number(r.position) === 1) firstPlaces += 1;
        });
      }

      // Build last 10 scrims chart (por ordem de criação do match)
      let killsByMatchSeries: Array<{ label: string; kills: number; mvps: number }> = [];
      if (matchesPlayed.size > 0) {
        const matchIds = Array.from(matchesPlayed);
        const { data: matchRows, error: mErr } = await supabase
          .from("training_matches")
          .select("id, created_at, match_number")
          .in("id", matchIds);
        if (mErr) throw mErr;

        const sorted = (matchRows || [])
          .slice()
          .sort((a: any, b: any) =>
            String(a.created_at || "").localeCompare(String(b.created_at || ""))
          )
          .slice(-10);

        killsByMatchSeries = sorted.map((m: any, idx: number) => {
          const agg = killsByMatch.get(String(m.id)) || { kills: 0, mvps: 0 };
          const label = m.match_number ? `M${m.match_number}` : `#${idx + 1}`;
          return { label, kills: agg.kills, mvps: agg.mvps };
        });
      }

      const kd = totalScrims ? totalKills / totalScrims : 0;

      const byGame: Record<string, { scrims: number; kills: number; mvps: number; kd: number }> = {};
      byGameAgg.forEach((v, g) => {
        const scrims = v.matches.size;
        const kd = scrims ? v.kills / scrims : 0;
        byGame[g] = { scrims, kills: v.kills, mvps: v.mvps, kd };
      });

      // Carregar conquistas do jogador
      const { data: userAchievements, error: uaError } = await (supabase as any)
        .from("user_achievements")
        .select("id, achievement_id, progress, unlocked_at, claimed_at")
        .eq("user_id", uid);

      if (uaError) throw uaError;

      const { data: achievementsDefs, error: achError } = await (supabase as any)
        .from("achievements")
        .select("id, name, description, target_value, audience")
        .eq("audience", "player");
      if (achError) throw achError;

      const uaByAchievementId = new Map<string, any>((userAchievements || []).map((ua: any) => [ua.achievement_id, ua]));

      const achievements = (achievementsDefs || []).map((def: any) => {
        const ua = uaByAchievementId.get(def.id);
        const target = def?.target_value ?? 1;
        const progress = ua?.progress ?? 0;
        const unlockedAt = (ua?.unlocked_at as string | null) ?? null;
        const claimedAt = (ua?.claimed_at as string | null) ?? null;
        const unlocked = !!unlockedAt || progress >= target;
        return {
          id: (ua?.id as string) ?? crypto.randomUUID(),
          achievementId: String(def.id),
          name: String(def?.name || "Missão"),
          description: (def?.description as string | null) ?? null,
          progress: Number(progress) || 0,
          targetValue: Number(target) || 1,
          unlocked,
          unlockedAt,
          claimedAt,
        };
      });

      const totalBadges = achievements.length;
      const unlockedBadges = achievements.filter((a) => a.unlocked).length;

      // Histórico real de scrims (baseado em inscrições do jogador via line_id)
      // Obs: isso independe de training_player_stats ter team_member_id preenchido.
      try {
        if (lineIds.length > 0) {
          const { data: regRows, error: regErr } = await (supabase as any)
            .from("training_registrations")
            .select("id, registered_at, slot_number, trainings ( id, name, datetime, game, status )")
            .in("line_id", lineIds)
            .order("registered_at", { ascending: false })
            .limit(30);
          if (regErr) throw regErr;

          const mapped = (regRows || []).map((r: any) => ({
            id: String(r.id),
            registered_at: String(r.registered_at),
            slot_number: r.slot_number != null ? Number(r.slot_number) : null,
            training: r.trainings
              ? {
                id: String(r.trainings.id),
                name: (r.trainings.name as string | null) ?? null,
                datetime: (r.trainings.datetime as string | null) ?? null,
                game: (r.trainings.game as string | null) ?? null,
                status: (r.trainings.status as string | null) ?? null,
              }
              : null,
          }));

          // Filtro por season (opcional) usando datetime do treino
          const filtered = !seasonStart
            ? mapped
            : mapped.filter((row) => {
              const dt = row.training?.datetime ? new Date(row.training.datetime).getTime() : null;
              if (!dt) return true;
              const end = seasonEnd ?? Number.POSITIVE_INFINITY;
              return dt >= seasonStart && dt < end;
            });

          setScrimHistory(filtered);
        } else {
          setScrimHistory([]);
        }
      } catch {
        // não bloqueia o perfil; apenas não mostra histórico
        setScrimHistory([]);
      }

      setStats({
        totalScrims,
        totalBadges,
        unlockedBadges,
        totalKills,
        mvps,
        kd,
        firstPlaces,
        killsByMatch: killsByMatchSeries,
        achievements,
        byGame,
      });
    } catch (error: any) {
      console.error("Erro ao carregar stats do jogador:", error);

      // Fallback: public RPC (scrims/kills/MVP) — never block UI.
      const core = await fetchPublicCoreStats();
      if (core) {
        const totalScrims = core.scrims;
        const totalKills = core.kills;
        const mvps = core.mvps;
        const kd = totalScrims ? totalKills / totalScrims : 0;

        setStats((prev) => ({
          ...prev,
          totalScrims,
          totalKills,
          mvps,
          kd,
        }));
        setStatsError(null);
      } else {
        setStatsError("Não foi possível carregar as estatísticas agora.");
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const preferredGames = useMemo(() => {
    const arr = Array.isArray(profile?.preferred_games)
      ? (profile.preferred_games as string[])
      : [];
    return arr
      .map((g) => String(g))
      .filter(Boolean)
      .slice(0, 6);
  }, [profile?.preferred_games]);

  const rarestAchievements = useMemo(() => {
    return (stats.achievements || [])
      .filter((a) => a.unlocked)
      .slice()
      .sort((a, b) => (b.targetValue || 0) - (a.targetValue || 0))
      .slice(0, 4);
  }, [stats.achievements]);

  const missions = useMemo(() => {
    return (stats.achievements || []).map((a) =>
      ({
        achievementId: a.achievementId,
        userAchievementId: a.id,
        name: a.name,
        description: a.description,
        progress: a.progress,
        targetValue: a.targetValue,
        unlocked: a.unlocked,
        unlockedAt: a.unlockedAt,
        claimedAt: a.claimedAt,
      }) satisfies MissionRow
    );
  }, [stats.achievements]);

  const claimedEmblems = useMemo(() => {
    return (stats.achievements || [])
      .filter((a) => !!a.claimedAt)
      .slice()
      .sort((a, b) => String(b.claimedAt || "").localeCompare(String(a.claimedAt || "")))
      .slice(0, 6);
  }, [stats.achievements]);

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
    return <UserProfileSkeleton />;
  }

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          className="relative h-[320px] md:h-[380px]"
          style={
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--profile-a" as any]: headerAccentA,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--profile-b" as any]: headerAccentB,
            } as React.CSSProperties
          }
        >
          {profile?.banner_url ? (
            <img
              src={profile.banner_url}
              alt={`Banner de ${profile.full_name || "perfil"}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--profile-a) / 0.62) 0%, hsl(var(--profile-b) / 0.18) 100%)",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        </div>

        {/* Overlap panel */}
        <div className="container mx-auto px-4 -mt-24 md:-mt-28 relative z-10">
          <Card className="p-4 md:p-6 bg-card/60 border-border backdrop-blur">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border border-border bg-card overflow-hidden flex items-center justify-center shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "Avatar"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <DefaultAvatarMark className="h-10 w-10 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight truncate">
                    {profile?.full_name || "Usuário"}
                  </h1>
                  {!isOrganizer && mainTeam?.tag ? (
                    <TeamTagBadge tag={mainTeam.tag} primaryColor={mainTeam.primary_color} />
                  ) : null}
                  {isOrganizer && organizerVerified ? (
                    <OrganizerBadge variant="pill" size="md" />
                  ) : null}
                  {!isOrganizer && playerVerified ? (
                    <PlayerVerifiedBadge variant="pill" size="md" />
                  ) : null}
                </div>

                {profile?.username ? (
                  <p className="mt-1 text-sm font-semibold text-primary">@{profile.username}</p>
                ) : null}

                {/* editorial chips */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isOrganizer ? (
                    <>
                      <StatChip icon={<Trophy className="h-3.5 w-3.5" />} label={<>{organizerSummary.totalTrainings} treinos</>} />
                      <StatChip icon={<Users className="h-3.5 w-3.5" />} label={<>{organizerSummary.totalRegistrations} inscrições</>} />
                      <StatChip icon={<Award className="h-3.5 w-3.5" />} label={<>{organizerTopGames[0]?.label || "—"}</>} />
                      <StatChip
                        icon={<UserPlus className="h-3.5 w-3.5" />}
                        label={<>{follow.loading ? "—" : `${follow.followersCount} seguidores`}</>}
                      />
                    </>
                  ) : (
                    <>
                      <StatChip icon={<Gamepad2 className="h-3.5 w-3.5" />} label={<>{stats.totalScrims} scrims</>} />
                      <StatChip icon={<Trophy className="h-3.5 w-3.5" />} label={<>{stats.mvps} MVP</>} />
                      <StatChip
                        icon={<Award className="h-3.5 w-3.5" />}
                        label={<>{stats.unlockedBadges} conquistas</>}
                      />
                      <StatChip
                        icon={<Monitor className="h-3.5 w-3.5" />}
                        label={<>{Number.isFinite(stats.kd) ? `K/D ${stats.kd.toFixed(2)}` : "K/D —"}</>}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                {!isOrganizer ? (
                  <ProfileSocialButtons
                    links={profile}
                    className="md:order-2 md:ml-auto justify-start md:justify-end"
                  />
                ) : null}
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" onClick={() => navigate("/invites")}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Convites
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </>
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
            </div>
          </Card>
        </div>
      </header>

      <main className="container mx-auto px-4 relative z-10 pb-12 pt-8">

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

            <PaymentComingSoon
              className="w-full"
              title="Planos de Assinatura"
              description="Os planos de assinatura e pagamentos em TorneCoins estarão disponíveis em breve."
            />

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
                      onClick={() => navigate(`/scrim/${t.id}`)}
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
            {statsError ? (
              <Alert className="mb-6">
                <AlertDescription>{statsError}</AlertDescription>
              </Alert>
            ) : null}
            <Tabs defaultValue="overview" className="mb-12">
              <TabsList
                className={
                  "grid w-full max-w-2xl mb-8 " +
                  (isOwnProfile ? "grid-cols-5" : "grid-cols-4")
                }
              >
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="scrims" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Scrims
                </TabsTrigger>
                {isOwnProfile ? (
                  <TabsTrigger value="missions" className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Missões
                  </TabsTrigger>
                ) : null}
                <TabsTrigger value="achievements" className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Conquistas
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Estatísticas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <ProfileRankingSelectors />

                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4">
                  <div className="space-y-4">
                    {profile?.id ? (
                      <SeasonRankCard
                        userId={profile.id}
                        gameId={selectedGame}
                        seasonId={selectedSeasonId}
                        highlight={!!selectedSeasonId}
                      />
                    ) : null}

                    {mainTeam?.id ? <ProfileTeamCard team={mainTeam} /> : null}
                  </div>
                  <aside className="space-y-4">
                    {profile?.id ? (
                      <ProfileSeasonSummaryCard userId={profile.id} gameId={selectedGame} seasonId={selectedSeasonId} />
                    ) : null}

                    <ProfileEmblemsCard claimedEmblems={claimedEmblems.map((e) => ({ achievementId: e.achievementId, name: e.name }))} />
                    <ProfilePreferredGamesCard games={preferredGames} />
                  </aside>
                </div>

                <Card className="p-6 bg-card/50 border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold uppercase">Conquistas mais raras</h3>
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

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rarestAchievements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Ainda nenhuma conquista desbloqueada.
                      </p>
                    ) : (
                      rarestAchievements.map((ach) => (
                        <div
                          key={ach.id}
                          className="rounded-lg border border-border bg-background/40 px-3 py-2"
                        >
                          <p className="text-sm font-semibold line-clamp-1">{ach.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {ach.description || `Meta: ${ach.targetValue}`}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
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
                <div className="space-y-4">
                  <Card className="p-6 bg-card/50 border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Histórico de Scrims</h2>
                        <p className="text-sm text-muted-foreground">
                          {scrimHistory.length > 0
                            ? `${scrimHistory.length} inscrições encontradas`
                            : "Nenhuma scrim encontrada para este jogador"}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {scrimHistory.length === 0 ? (
                    <Card className="p-8 bg-card/50 border-border text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Sem histórico</h3>
                      <p className="text-muted-foreground">
                        Quando o jogador se inscrever em treinos, eles aparecerão aqui.
                      </p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {scrimHistory.map((row) => {
                        const t = row.training;
                        return (
                          <button
                            key={row.id}
                            className="text-left"
                            onClick={() => (t?.id ? navigate(`/scrim/${t.id}`) : null)}
                            disabled={!t?.id}
                          >
                            <Card className="p-5 bg-background/45 border-border hover:bg-background/55 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">
                                    {t?.name || "Treino"}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t?.datetime ? new Date(t.datetime).toLocaleString("pt-BR") : "Data não informada"}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t?.game ? (GAME_LABELS[t.game] || t.game) : "Jogo não informado"}
                                    {row.slot_number != null ? ` • Slot ${row.slot_number}` : ""}
                                  </p>
                                </div>
                                {t?.status ? (
                                  <span className="text-[11px] uppercase tracking-widest px-2 py-1 rounded-full bg-card/40 text-muted-foreground border border-border shrink-0">
                                    {t.status}
                                  </span>
                                ) : null}
                              </div>
                            </Card>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {isOwnProfile ? (
                <TabsContent value="missions" className="space-y-4">
                  <MissionsTab
                    missions={missions}
                    canClaim={isOwnProfile}
                    onClaimed={(achievementId, claimedAt) => {
                      setStats((prev) => ({
                        ...prev,
                        achievements: prev.achievements.map((a) =>
                          a.achievementId === achievementId ? { ...a, claimedAt } : a
                        ),
                      }));
                    }}
                  />
                </TabsContent>
              ) : null}

              <TabsContent value="achievements" className="space-y-4">
                <Card className="p-6 bg-card/50 border-border">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Conquistas</h2>
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
                    className="mt-4 h-1"
                  />

                  <div className="mt-6">
                    {stats.achievements.filter((a) => a.unlocked).length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nenhuma conquista registrada ainda. Jogue scrims e acumule kills/MVPs
                        para começar a desbloquear conquistas.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.achievements
                          .filter((a) => a.unlocked)
                          .slice()
                          .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
                          .map((ach) => {
                            const percent = ach.targetValue
                              ? Math.min(100, (ach.progress / ach.targetValue) * 100)
                              : 0;

                            return (
                              <Card
                                key={ach.id}
                                className={
                                  "p-5 bg-background/45 border-border overflow-hidden " +
                                  (ach.unlocked
                                    ? "ring-1 ring-primary/25 border-primary/25"
                                    : "opacity-95")
                                }
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div
                                      className={
                                        "h-12 w-12 rounded-2xl border border-border flex items-center justify-center shrink-0 " +
                                        (ach.unlocked ? "bg-primary/12" : "bg-muted/30")
                                      }
                                    >
                                      {ach.unlocked ? (
                                        <CheckCircle2 className="h-6 w-6 text-primary" />
                                      ) : (
                                        <Award className="h-6 w-6 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-extrabold uppercase tracking-tight truncate">
                                        {ach.name}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                        {ach.description || `Meta: ${ach.targetValue}`}
                                      </p>
                                    </div>
                                  </div>

                                  {ach.unlocked ? (
                                    <span className="text-[11px] uppercase tracking-widest px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                      Unlocked
                                    </span>
                                  ) : (
                                    <span className="text-[11px] uppercase tracking-widest px-2 py-1 rounded-full bg-card/40 text-muted-foreground border border-border">
                                      Locked
                                    </span>
                                  )}
                                </div>

                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Progresso</span>
                                    <span className="tabular-nums">
                                      {ach.progress} / {ach.targetValue}
                                    </span>
                                  </div>
                                  <Progress value={percent} className="mt-2 h-1.5" />
                                </div>
                              </Card>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="stats">
                <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_.7fr] gap-4">
                  <Card className="p-6 bg-card/50 border-border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{stats.totalScrims}</p>
                        <p className="text-sm text-muted-foreground">Scrims</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{stats.totalKills}</p>
                        <p className="text-sm text-muted-foreground">Kills</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {Number.isFinite(stats.kd) ? stats.kd.toFixed(2) : "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">K/D</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{stats.firstPlaces}</p>
                        <p className="text-sm text-muted-foreground">Vitórias</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Desempenho por jogo
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {statsLoading
                          ? Array.from({ length: 3 }).map((_, i) => (
                            <ProfileGameStatCardSkeleton key={i} />
                          ))
                          : Object.entries(stats.byGame)
                            .slice()
                            .sort(([, a], [, b]) => (b?.scrims || 0) - (a?.scrims || 0))
                            .map(([gameId, s]) => {
                              const logo = getGameLogo(gameId as any);
                              const label = getGameLabel(gameId as any);
                              const kdValue = Number.isFinite(s.kd) ? s.kd : 0;

                              return (
                                <Card
                                  key={gameId}
                                  className="overflow-hidden bg-background/45 border-border p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-extrabold uppercase tracking-tight truncate">
                                        {label}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {s.scrims ? `${s.scrims} scrims` : "Sem scrims"}
                                      </p>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl border border-border bg-card/40 overflow-hidden shrink-0">
                                      {logo ? (
                                        <img
                                          src={logo}
                                          alt={`Logo do jogo ${label}`}
                                          className="h-full w-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-border bg-card/40 px-3 py-2">
                                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                        Kills
                                      </p>
                                      <p className="mt-1 text-sm font-bold tabular-nums">
                                        {s.kills}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card/40 px-3 py-2">
                                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                        MVPs
                                      </p>
                                      <p className="mt-1 text-sm font-bold tabular-nums">
                                        {s.mvps}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card/40 px-3 py-2">
                                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                        K/D
                                      </p>
                                      <p className="mt-1 text-sm font-bold tabular-nums">
                                        {kdValue ? kdValue.toFixed(2) : "—"}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card/40 px-3 py-2">
                                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                        K/Scrim
                                      </p>
                                      <p className="mt-1 text-sm font-bold tabular-nums">
                                        {s.scrims ? (s.kills / s.scrims).toFixed(1) : "—"}
                                      </p>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}

                        {!statsLoading && Object.keys(stats.byGame).length === 0 ? (
                          <Card className="p-4 bg-background/40 border-border">
                            <p className="text-sm text-muted-foreground">
                              Sem dados suficientes ainda.
                            </p>
                          </Card>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4 bg-background/40 border-border">
                        <h3 className="text-sm font-semibold uppercase">
                          Kills (últimas 10 scrims)
                        </h3>
                        <div className="mt-3">
                          <ChartContainer
                            config={{
                              kills: {
                                label: "Kills",
                                theme: { light: "hsl(var(--primary))", dark: "hsl(var(--primary))" },
                              },
                              mvps: {
                                label: "MVP",
                                theme: { light: "hsl(var(--secondary))", dark: "hsl(var(--secondary))" },
                              },
                            }}
                            className="h-[220px] w-full"
                          >
                            <BarChart data={stats.killsByMatch} margin={{ left: 8, right: 8 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} />
                              <YAxis tickLine={false} axisLine={false} width={32} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              <Bar dataKey="kills" fill="var(--color-kills)" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="mvps" fill="var(--color-mvps)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ChartContainer>
                        </div>
                        {stats.killsByMatch.length === 0 ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Sem dados suficientes ainda.
                          </p>
                        ) : null}
                      </Card>

                      <Card className="p-4 bg-background/40 border-border">
                        <h3 className="text-sm font-semibold uppercase">
                          Desempenho por scrim
                        </h3>
                        <div className="mt-3">
                          <ChartContainer
                            config={{
                              kills: {
                                label: "Kills",
                                theme: { light: "hsl(var(--primary))", dark: "hsl(var(--primary))" },
                              },
                            }}
                            className="h-[220px] w-full"
                          >
                            <LineChart data={stats.killsByMatch} margin={{ left: 8, right: 8 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} />
                              <YAxis tickLine={false} axisLine={false} width={32} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line
                                type="monotone"
                                dataKey="kills"
                                stroke="var(--color-kills)"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ChartContainer>
                        </div>
                      </Card>
                    </div>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <p className="text-xs text-muted-foreground">MVPs</p>
                        <p className="text-lg font-bold">{stats.mvps}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <p className="text-xs text-muted-foreground">Winrate</p>
                        <p className="text-lg font-bold">
                          {stats.totalScrims
                            ? `${Math.round((stats.firstPlaces / stats.totalScrims) * 100)}%`
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <p className="text-xs text-muted-foreground">Jogo</p>
                        <p className="text-lg font-bold">{getGameLabel(selectedGame)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <p className="text-xs text-muted-foreground">Kills / scrim</p>
                        <p className="text-lg font-bold">
                          {stats.totalScrims
                            ? (stats.totalKills / stats.totalScrims).toFixed(1)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <aside className="space-y-4">
                    {profile?.id ? (
                      <ProfileSeasonSummaryCard
                        userId={profile.id}
                        gameId={selectedGame}
                        seasonId={selectedSeasonId}
                      />
                    ) : null}

                    <Card className="p-5 bg-card/50 border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Jogos que joga
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {preferredGames.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum jogo favorito definido.
                          </p>
                        ) : (
                          preferredGames.map((g) => {
                            const logo = getGameLogo(g);
                            const label = getGameLabel(g);
                            return (
                              <div
                                key={g}
                                className="h-11 w-11 rounded-xl border border-border bg-background/40 overflow-hidden"
                                title={label}
                              >
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt={`Logo do jogo ${label}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Card>

                    <ProfileTeamCard team={mainTeam} />
                  </aside>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        )}
      </main>
    </MainLayout>
  );
};

export default UserProfile;
