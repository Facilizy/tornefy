import { useMemo, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrganizerFollow } from "@/hooks/useOrganizerFollow";
import {
  Calendar,
  Clock,
  Users,
  Monitor,
  Gamepad2,
  Trophy,
  MessageCircle,
  Video,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Info,
  Medal,
  Swords,
  Radio,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { TrainingChat } from "@/components/TrainingChat";
import { RegistrationConfirmDialog } from "@/components/RegistrationConfirmDialog";
import { Scoreboard } from "@/components/Scoreboard";
import { MatchesTab } from "@/components/MatchesTab";
import { FloatingChat } from "@/components/FloatingChat";
import { EventInfoSection } from "@/components/EventInfoSection";
import { TrainingSettingsTab } from "@/components/TrainingSettingsTab";
import { PointsTableCard } from "@/components/training/PointsTableCard";
import { MvpListCard } from "@/components/training/MvpListCard";
import { MinimumTeamsProgress } from "@/components/training/MinimumTeamsProgress";
import { LoginRequiredCard } from "@/components/LoginRequiredCard";

// Banner sizes constants
export const BANNER_SIZES = {
  CARD: { width: 400, height: 192, aspectRatio: "2.08:1" },
  PAGE: { width: 1920, height: 400, aspectRatio: "4.8:1" },
};

const TrainingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [training, setTraining] = useState<any>(null);
  const [organizerProfile, setOrganizerProfile] = useState<any>(null);
  const followOrganizer = useOrganizerFollow(organizerProfile?.id);
  const [organizerUpcomingTrainings, setOrganizerUpcomingTrainings] = useState<any[]>([]);
  const [isVerifiedOrganizer, setIsVerifiedOrganizer] = useState(false);
  const [isVerifiedOrganizerRole, setIsVerifiedOrganizerRole] = useState(false);
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([]);
  const [registeredTeamsCount, setRegisteredTeamsCount] = useState(0);
  const [hasAnyScores, setHasAnyScores] = useState(false);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [myTeamLines, setMyTeamLines] = useState<any[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [confirmMode, setConfirmMode] = useState<"register" | "claim">("register");

  const [waitlistCount, setWaitlistCount] = useState(0);
  const [isInWaitlist, setIsInWaitlist] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  const [isTeamAdmin, setIsTeamAdmin] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinDialogTitle, setCheckinDialogTitle] = useState("");
  const [checkinDialogMessage, setCheckinDialogMessage] = useState("");

  const [sessionExpired, setSessionExpired] = useState(false);

  const rtRefetchTimeoutRef = useRef<number | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());

  const isAuthed = !!user;
  const confirmedTeamsCount = registeredTeamsCount;
  const isFull = confirmedTeamsCount >= (training?.max_slots || 0);

  useEffect(() => {
    // Keep local auth state in sync (helps detect session expiry)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        await fetchProfile(sessionUser.id);
        await Promise.all([fetchTrainingDetails(sessionUser.id), fetchMyTeam(sessionUser.id)]);
      } else {
        await fetchTrainingDetails();
      }
    };

    if (id) init();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Realtime: keep registration state/count/teams in sync without reload
  useEffect(() => {
    if (!id || !user?.id) return;

    const schedule = () => {
      if (rtRefetchTimeoutRef.current) window.clearTimeout(rtRefetchTimeoutRef.current);
      rtRefetchTimeoutRef.current = window.setTimeout(async () => {
        await fetchTrainingDetails(user.id);
        await fetchMyWaitlistAndCheckin();
      }, 250);
    };

    const channel = supabase
      .channel(`rt-training-reg-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "training_registrations", filter: `training_id=eq.${id}` },
        () => schedule()
      )
      .subscribe();

    return () => {
      if (rtRefetchTimeoutRef.current) window.clearTimeout(rtRefetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, myTeam?.id]);

  // Auto-resume: if user logged in after being redirected, reopen registration modal
  useEffect(() => {
    if (!isAuthed || !id) return;

    try {
      const raw = localStorage.getItem("post_auth_action");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.type === "training_register" && parsed?.trainingId === id) {
        localStorage.removeItem("post_auth_action");
        setConfirmMode("register");
        setShowConfirmDialog(true);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, id]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
  };

  const fetchTrainingDetails = async (userId?: string) => {
    try {
      setLoading(true);
      const { data: trainingData, error: trainingError } = await supabase
        .from("trainings")
        .select("*")
        .eq("id", id)
        .single();

      if (trainingError) throw trainingError;
      setTraining(trainingData);

      // detect if there is any score registered for this training
      try {
        const { count } = await supabase
          .from("training_match_scores")
          .select(
            `id,
            training_matches!inner (
              id,
              training_id
            )`,
            { count: "exact", head: true }
          )
          .eq("training_matches.training_id", id);

        setHasAnyScores((count || 0) > 0);
      } catch {
        setHasAnyScores(false);
      }

      // Organizer info (perfil + selo verificado) + próximos treinos do organizador
      if (trainingData?.organizer_id) {
        const organizerId = trainingData.organizer_id as string;

        const [organizerInfo, upcomingRes] = await Promise.all([
          Promise.all([
            supabase
              .from("profiles")
              .select("id, username, full_name")
              .eq("id", organizerId)
              .maybeSingle(),
            supabase
              .from("trainings")
              .select("id", { count: "exact", head: true })
              .eq("organizer_id", organizerId),
            (supabase as any)
              .from("user_roles")
              .select("role")
              .eq("user_id", organizerId)
              .eq("role", "organizer_verified")
              .maybeSingle(),
          ]),
          supabase
            .from("trainings")
            .select("id, name, datetime, status, platform, mode, game")
            .eq("organizer_id", organizerId)
            .neq("id", id)
            .gt("datetime", new Date().toISOString())
            .order("datetime", { ascending: true })
            .limit(3),
        ]);

        const [{ data: organizerP }, { count: totalTrainings }, { data: verifiedRow }] = organizerInfo;

        setOrganizerProfile(organizerP);
        setIsVerifiedOrganizer((totalTrainings || 0) >= 10);
        setIsVerifiedOrganizerRole(!!verifiedRow);
        setOrganizerUpcomingTrainings(upcomingRes.data || []);
      } else {
        setOrganizerProfile(null);
        setIsVerifiedOrganizer(false);
        setIsVerifiedOrganizerRole(false);
        setOrganizerUpcomingTrainings([]);
      }

      // Public visitors: fetch only the count of confirmed teams so we can show progress/UI.
      if (!userId) {
        const { count } = await supabase
          .from("training_registrations")
          .select("id", { count: "exact", head: true })
          .eq("training_id", id);

        setRegisteredTeamsCount(count || 0);
        setRegisteredTeams([]);
        setIsRegistered(false);
        return;
      }

      const { data: registrationsData, error: registrationsError } = await supabase
        .from("training_registrations")
        .select(
          `
          *,
          teams (
            id,
            name,
            tag,
            logo_url,
            owner_id,
            is_external
          )
        `
        )
        .eq("training_id", id);

      if (registrationsError) throw registrationsError;
      setRegisteredTeams(registrationsData || []);
      setRegisteredTeamsCount((registrationsData || []).length);

      const myRegistration = registrationsData?.find((reg: any) => reg.teams?.owner_id === userId);
      setIsRegistered(!!myRegistration);
    } catch (error: any) {
      toast.error("Erro ao carregar detalhes do treino");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeam = async (userId: string) => {
    const { data } = await supabase.from("teams").select("*").eq("owner_id", userId).maybeSingle();

    setMyTeam(data);

    if (data) {
      const { data: lines } = await supabase
        .from("team_lines")
        .select("*")
        .eq("team_id", data.id)
        .order("created_at", { ascending: true });

      setMyTeamLines(lines || []);
    }
  };

  const handleRegisterClick = async () => {
    // Quick session check before opening the dialog (better UX when session expired)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setSessionExpired(true);
      try {
        localStorage.setItem(
          "post_auth_action",
          JSON.stringify({ type: "training_register", trainingId: id })
        );
      } catch {
        // ignore
      }
      toast.error("Sessão expirada, faça login novamente.");
      navigate("/auth");
      return;
    }

    if (!myTeam) {
      toast.error("Você precisa criar uma equipe primeiro!");
      navigate("/my-team");
      return;
    }

    const { data: banCheck } = await supabase
      .from("team_bans")
      .select("*")
      .eq("team_tag", myTeam.tag)
      .gt("banned_until", new Date().toISOString())
      .maybeSingle();

    if (banCheck) {
      const banUntil = new Date(banCheck.banned_until).toLocaleDateString("pt-BR");
      toast.error(`Sua equipe está banida até ${banUntil}. Motivo: ${banCheck.reason || "Denúncias múltiplas"}`);
      return;
    }

    const { data: blacklistCount, error: countError } = await (supabase as any).rpc(
      "count_active_blacklists_from_different_organizers",
      {
        _team_tag: myTeam.tag,
      }
    );

    if (!countError && blacklistCount && blacklistCount >= 3) {
      toast.error("⚠️ ATENÇÃO: Sua equipe possui 3 ou mais blacklists de organizadores diferentes.", {
        duration: 6000,
      });
    }

    const { data: members } = await supabase.from("team_members").select("*").eq("team_id", myTeam.id);

    const minMembers: { [key: string]: number } = {
      Solo: 1,
      Duo: 2,
      Squad: 4,
    };

    const required = minMembers[training.mode] || 1;
    if (!members || members.length < required) {
      toast.error(`Sua equipe precisa ter pelo menos ${required} jogador(es) para o modo ${training.mode}!`);
      return;
    }

    const { data: blacklisted } = await supabase
      .from("organizer_blacklist")
      .select("*")
      .eq("organizer_id", training.organizer_id)
      .eq("team_tag", myTeam.tag)
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .maybeSingle();

    if (blacklisted) {
      const expiresAt = blacklisted.expires_at
        ? ` (expira em ${new Date(blacklisted.expires_at).toLocaleDateString("pt-BR")})`
        : "";
      toast.error(`Sua equipe está na blacklist deste organizador${expiresAt}!`);
      return;
    }

    if (training.is_private && !training.invited_tags.includes(myTeam.tag)) {
      toast.error("Treino privado. Sua equipe não está na lista de convidados!");
      return;
    }

    if (
      training.status === "INSCRIÇÕES ENCERRADAS" ||
      training.status === "EM ANDAMENTO" ||
      training.status === "FINALIZADO"
    ) {
      toast.error("As inscrições para este treino estão encerradas!");
      return;
    }

    if (confirmedTeamsCount >= training.max_slots) {
      toast.error("Este treino já está lotado!");
      return;
    }

    setConfirmMode("register");
    setShowConfirmDialog(true);
    setSelectedLineId(myTeamLines.length === 1 ? myTeamLines[0].id : "");
  };

  const handleRegisterConfirm = async () => {
    if (confirmMode === "claim") {
      await handleClaimSlot();
      return;
    }

    // Guard against expired session (prevents RLS violation on insert)
    if (!user?.id) {
      setSessionExpired(true);
      try {
        localStorage.setItem(
          "post_auth_action",
          JSON.stringify({ type: "training_register", trainingId: id })
        );
      } catch {
        // ignore
      }
      toast.error("Sessão expirada, faça login novamente.");
      setShowConfirmDialog(false);
      navigate("/auth");
      return;
    }

    if (!myTeam?.id) {
      toast.error("Equipe não encontrada!");
      return;
    }

    try {
      setActionLoading(true);

      const { data: existingRegistrations } = await supabase
        .from("training_registrations")
        .select("slot_number")
        .eq("training_id", id!)
        .order("slot_number", { ascending: true });

      let nextSlot = 1;
      if (existingRegistrations && existingRegistrations.length > 0) {
        const usedSlots = existingRegistrations
          .map((r) => r.slot_number)
          .filter((s) => s !== null)
          .sort((a, b) => a - b);

        for (let i = 1; i <= training.max_slots; i++) {
          if (!usedSlots.includes(i)) {
            nextSlot = i;
            break;
          }
        }
      }

      const insertPayload: any = {
        training_id: id,
        team_id: myTeam.id,
        slot_number: nextSlot,
      };

      if (selectedLineId) {
        insertPayload.line_id = selectedLineId;
      }

      const { error } = await supabase.from("training_registrations").insert(insertPayload);

      if (error) throw error;
      toast.success(`Equipe inscrita com sucesso! Slot ${nextSlot}`);
      setShowConfirmDialog(false);
      fetchTrainingDetails();
    } catch (error: any) {
      toast.error(error.message || "Erro ao inscrever equipe");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!myTeam) {
      toast.error("Equipe não encontrada!");
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("training_registrations")
        .delete()
        .eq("training_id", id)
        .eq("team_id", myTeam.id);

      if (error) throw error;
      toast.success("Inscrição cancelada!");
      fetchTrainingDetails();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar inscrição");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchMyWaitlistAndCheckin = async () => {
    if (!id) return;

    try {
      // waitlist count is public to team admins only, but we only show it to authed users anyway
      const { count } = await (supabase as any)
        .from("training_waitlist")
        .select("id", { count: "exact", head: true })
        .eq("training_id", id)
        .eq("status", "active");
      setWaitlistCount(count || 0);

      if (!myTeam) {
        setIsInWaitlist(false);
        setHasCheckedIn(false);
        return;
      }

      const [{ data: w }, { data: c }] = await Promise.all([
        (supabase as any)
          .from("training_waitlist")
          .select("id")
          .eq("training_id", id)
          .eq("team_id", myTeam.id)
          .eq("status", "active")
          .maybeSingle(),
        (supabase as any)
          .from("training_checkins")
          .select("id")
          .eq("training_id", id)
          .eq("team_id", myTeam.id)
          .maybeSingle(),
      ]);

      setIsInWaitlist(!!w);
      setHasCheckedIn(!!c);
    } catch (e: any) {
      // avoid noisy toasts; UI will still work
      console.warn("fetchMyWaitlistAndCheckin", e);
    }
  };

  useEffect(() => {
    if (!isAuthed) return;
    fetchMyWaitlistAndCheckin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthed, myTeam?.id, training?.datetime, registeredTeamsCount]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id || !myTeam?.id) {
        setIsTeamAdmin(false);
        return;
      }
      try {
        const { data, error } = await (supabase as any).rpc("is_team_admin", {
          _team_id: myTeam.id,
          _user_id: user.id,
        });
        if (error) throw error;
        setIsTeamAdmin(!!data);
      } catch {
        setIsTeamAdmin(false);
      }
    };
    run();
  }, [user?.id, myTeam?.id]);

  const handleJoinWaitlist = async () => {
    if (!id || !myTeam) return;
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("training_waitlist")
        .insert({ training_id: id, team_id: myTeam.id, status: "active" });
      if (error) throw error;
      toast.success("Você entrou na lista de espera!");
      fetchMyWaitlistAndCheckin();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao entrar na waitlist");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!id || !myTeam) return;
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("training_waitlist")
        .delete()
        .eq("training_id", id)
        .eq("team_id", myTeam.id);
      if (error) throw error;
      toast.success("Você saiu da lista de espera.");
      fetchMyWaitlistAndCheckin();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao sair da waitlist");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimSlot = async () => {
    if (!id || !myTeam) return;
    try {
      setActionLoading(true);
      const { data, error } = await (supabase as any).rpc("claim_waitlist_slot", {
        _training_id: id,
        _team_id: myTeam.id,
        _line_id: selectedLineId || null,
      });
      if (error) throw error;

      toast.success(`Você pegou a vaga! Slot #${data?.slot_number ?? "—"}`);
      setShowConfirmDialog(false);
      await fetchTrainingDetails();
      await fetchMyWaitlistAndCheckin();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível pegar a vaga");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenClaimDialog = () => {
    setConfirmMode("claim");
    setShowConfirmDialog(true);
    setSelectedLineId(myTeamLines.length === 1 ? myTeamLines[0].id : "");
  };

  const handleCheckin = async () => {
    if (!id || !myTeam || !user) return;
    try {
      setActionLoading(true);
      const { error } = await supabase.from("training_checkins").insert({
        training_id: id,
        team_id: myTeam.id,
        checked_in_by: user.id,
      });
      if (error) throw error;
      toast.success("Check-in confirmado!");
      fetchMyWaitlistAndCheckin();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível fazer check-in");
    } finally {
      setActionLoading(false);
    }
  };

  const openCheckinDialog = (title: string, message: string) => {
    setCheckinDialogTitle(title);
    setCheckinDialogMessage(message);
    setCheckinDialogOpen(true);
  };

  const checkinWindow = useMemo(() => {
    const dt = training?.datetime ? new Date(training.datetime) : null;
    if (!dt) return { canCheckIn: false, reason: "Treino sem horário definido." };

    const now = new Date(nowTick);
    const openAt = new Date(dt.getTime() - 60 * 60 * 1000);
    const closeAt = new Date(dt.getTime() - 10 * 60 * 1000);

    if (now < openAt) return { canCheckIn: false, reason: "O check-in abre 1h antes do evento." };
    if (now > closeAt) return { canCheckIn: false, reason: "O check-in já foi encerrado (fecha 10min antes)." };
    return { canCheckIn: true, reason: "" };
  }, [training?.datetime, nowTick]);

  const handleCheckinClick = async () => {
    if (!id || !myTeam || !user) return;

    if (!checkinWindow.canCheckIn) {
      openCheckinDialog("Check-in indisponível", checkinWindow.reason);
      return;
    }

    if (!isTeamAdmin) {
      openCheckinDialog("Somente admin", "Somente admin da equipe pode fazer o check-in.");
      return;
    }

    await handleCheckin();
  };

  const handleUndoCheckin = async () => {
    if (!id || !myTeam) return;
    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("training_checkins")
        .delete()
        .eq("training_id", id)
        .eq("team_id", myTeam.id);
      if (error) throw error;
      toast.success("Check-in removido.");
      fetchMyWaitlistAndCheckin();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível remover o check-in");
    } finally {
      setActionLoading(false);
    }
  };

  const isOrganizer = profile?.role === "organizer" && training?.organizer_id === user?.id;
  const eventPrimaryColor = training?.primary_color || "#9146FF";
  const eventSecondaryColor = training?.secondary_color || "#1F2937";

  const organizerVerified = isVerifiedOrganizer || isVerifiedOrganizerRole;

  if (loading) {
    return (
      <MainLayout showFooter={false}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!training) {
    return (
      <MainLayout showFooter={false}>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Treino não encontrado</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Voltar
          </Button>
        </div>
      </MainLayout>
    );
  }

  const getPlatformIcon = (
    platform: string,
    opts?: { className?: string; style?: React.CSSProperties }
  ) => {
    const className = opts?.className || "w-5 h-5";
    const style = opts?.style;

    return platform === "PC" || platform === "Misto" ? (
      <Monitor className={className} style={style} />
    ) : (
      <Gamepad2 className={className} style={style} />
    );
  };

  const getGameName = (game?: string) => {
    if (!game) return "";
    const names: Record<string, string> = {
      free_fire: "Free Fire",
      blood_strike: "Blood Strike",
      farlight_84: "Farlight 84",
      prime_rush: "Prime Rush",
      battlefield_6: "Battlefield 6",
    };
    return names[game] || game;
  };

  const getGameLogo = (game?: string) => {
    if (!game) return "";
    const logos: Record<string, string> = {
      free_fire: "/game-logos/free-fire.png",
      blood_strike: "/game-logos/blood-strike.png",
      farlight_84: "/game-logos/farlight-84.png",
      prime_rush: "/game-logos/prime-rush.png",
      battlefield_6: "/game-logos/battlefield-6.png",
    };
    return logos[game] || "";
  };

  return (
    <MainLayout showFooter={false}>
      <main className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Banner - tamanho mais comum (mais alto) */}
        <div
          className="relative h-[260px] sm:h-[340px] lg:h-[420px] rounded-2xl overflow-hidden mb-6"
          style={{
            background: !training.banner_url
              ? `linear-gradient(135deg, ${training.primary_color || "#9146FF"} 0%, ${
                  training.secondary_color || "#1F2937"
                } 100%)`
              : undefined,
          }}
        >
          {training.banner_url ? (
            <img
              src={training.banner_url}
              alt={training.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Trophy className="w-20 h-20 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          {/* Status badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex gap-2">
              {training.is_live && (
                <Badge variant="destructive" className="backdrop-blur-sm">
                  <Radio className="w-3 h-3" />
                  AO VIVO
                </Badge>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 right-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white uppercase">
              {training.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                {getPlatformIcon(training.platform)}
                <span className="font-semibold">{training.platform}</span>
              </span>
              <span className="text-white/40">•</span>
              <Badge variant="secondary" className="backdrop-blur-sm">
                {training.status || "INSCRIÇÕES ABERTAS"}
              </Badge>
              {training.is_live && (
                <Badge variant="destructive" className="backdrop-blur-sm">
                  <Radio className="w-3 h-3" />
                  AO VIVO
                </Badge>
              )}
            </div>

            {training.organizer_id && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80">
                <span className="text-white/60">Criado por</span>
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${training.organizer_id}`)}
                  className="inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="font-semibold text-white">
                    @{organizerProfile?.username || "organizador"}
                  </span>
                  {organizerVerified && <VerifiedBadge label="Organizador verificado" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-card/80 border border-border p-2 h-auto">
            <TabsTrigger
              value="overview"
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors"
              style={
                activeTab === "overview"
                  ? { backgroundColor: eventPrimaryColor, color: "white" }
                  : { color: eventPrimaryColor }
              }
            >
              <Info className="w-4 h-4" />
              <span>Visão Geral</span>
            </TabsTrigger>

            <TabsTrigger
              value="ranking"
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors"
              style={
                activeTab === "ranking"
                  ? { backgroundColor: eventPrimaryColor, color: "white" }
                  : { color: eventPrimaryColor }
              }
            >
              <Medal className="w-4 h-4" />
              <span>Ranking</span>
            </TabsTrigger>

            <TabsTrigger
              value="teams"
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors"
              style={
                activeTab === "teams"
                  ? { backgroundColor: eventPrimaryColor, color: "white" }
                  : { color: eventPrimaryColor }
              }
            >
              <Users className="w-4 h-4" />
              <span>Equipes</span>
            </TabsTrigger>

            <TabsTrigger
              value="matches"
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors"
              style={
                activeTab === "matches"
                  ? { backgroundColor: eventPrimaryColor, color: "white" }
                  : { color: eventPrimaryColor }
              }
            >
              <Swords className="w-4 h-4" />
              <span>Partidas</span>
            </TabsTrigger>

            {isAuthed && (isOrganizer || isRegistered) && (
              <TabsTrigger
                value="chat"
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors"
                style={
                  activeTab === "chat"
                    ? { backgroundColor: eventPrimaryColor, color: "white" }
                    : { color: eventPrimaryColor }
                }
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat</span>
              </TabsTrigger>
            )}

            {training.is_live && (
              <TabsTrigger
                value="live"
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground transition-colors"
              >
                <Radio className="w-4 h-4" />
                <span>Ao Vivo</span>
              </TabsTrigger>
            )}

            {isAuthed && isOrganizer && (
              <TabsTrigger
                value="settings"
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors"
                style={
                  activeTab === "settings"
                    ? { backgroundColor: eventPrimaryColor, color: "white" }
                    : { color: eventPrimaryColor }
                }
              >
                <Settings className="w-4 h-4" />
                <span>Configurações</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick stats */}
                <Card className="p-6 bg-card/80 border-border">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl font-bold">Visão Geral</h2>
                      <p className="text-xs text-muted-foreground">
                        Informações principais, regras e equipes confirmadas.
                      </p>
                    </div>
                    {training.game && getGameLogo(training.game) && (
                      <div className="flex items-center gap-3">
                        <img
                          src={getGameLogo(training.game)}
                          alt={`Logo do jogo ${getGameName(training.game)}`}
                          className="h-10 w-10 rounded-lg object-cover border"
                          loading="lazy"
                        />
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Jogo</div>
                          <div className="font-semibold text-sm uppercase">
                            {getGameName(training.game)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-background/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                        Data
                      </div>
                      <div className="mt-2 font-semibold text-sm">
                        {format(new Date(training.datetime), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                        Horário
                      </div>
                      <div className="mt-2 font-semibold text-sm">
                        {format(new Date(training.datetime), "HH:mm", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                        Times confirmados
                      </div>
                      <div className="mt-2 font-semibold text-sm">
                        {confirmedTeamsCount}/{training.max_slots}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Trophy className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                        Rodadas
                      </div>
                      <div className="mt-2 font-semibold text-sm">{training.rounds}</div>
                    </div>

                    <div className="rounded-xl border bg-background/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Gamepad2 className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                        Modo
                      </div>
                      <div className="mt-2 font-semibold text-sm">{training.mode}</div>
                    </div>

                    <div className="rounded-xl border bg-background/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getPlatformIcon(training.platform, {
                          className: "w-4 h-4",
                          style: { color: eventPrimaryColor },
                        })}
                        Plataforma
                      </div>
                      <div className="mt-2 font-semibold text-sm">{training.platform}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <MinimumTeamsProgress
                      confirmedTeams={confirmedTeamsCount}
                      maxTeams={training.max_slots}
                      primaryColor={eventPrimaryColor}
                    />
                  </div>
                </Card>

                {/* Highlights */}
                <Card className="p-6 bg-card/80 border-border">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Trophy className="w-5 h-5" style={{ color: eventPrimaryColor }} />
                    Regras
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Leia com atenção antes de se inscrever.
                  </p>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-8">
                    {training.rules || "Sem regras cadastradas ainda."}
                  </div>
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const el = document.getElementById("event-info-section-anchor");
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Abrir regras completas
                    </Button>
                  </div>
                </Card>

                 <PointsTableCard
                   pointsPerKill={training.points_per_kill ?? 1}
                   pointsPerPosition={training.points_per_position}
                   pointsPerPositionText={training.points_per_position_text}
                   primaryColor={eventPrimaryColor}
                 />

                {training.important_info && (
                  <Card className="p-6 bg-card/80 border-border">
                    <h3 className="font-semibold mb-3">⚠️ Informações Importantes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                      {training.important_info}
                    </p>
                  </Card>
                )}

                {/* Confirmed teams preview */}
                <Card className="p-6 bg-card/80 border-border">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold">Times confirmados</h3>
                      <p className="text-xs text-muted-foreground">
                        Prévia rápida (o completo fica na aba Equipes).
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTab("teams")}>
                      Ver todos
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  {registeredTeams.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma equipe inscrita ainda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {registeredTeams.slice(0, 6).map((r: any) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 rounded-lg border bg-background/50 p-3"
                        >
                          {r.teams?.logo_url ? (
                            <img
                              src={r.teams.logo_url}
                              alt={`Logo da equipe ${r.teams.name}`}
                              className="h-10 w-10 rounded-md object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center text-xs font-bold">
                              {(r.teams?.tag || "??").slice(0, 2)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm uppercase truncate">
                              {r.teams?.name || "Equipe"}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase">
                              [{r.teams?.tag}]
                              {r.slot_number ? ` • #${r.slot_number}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Organizer Card */}
                {organizerProfile && (
                  <Card className="p-6 bg-card/80 border-border">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                      Organizador
                    </h3>
                    
                    <div className="flex items-center gap-3 mb-4">
                      {organizerProfile.avatar_url ? (
                        <img
                          src={organizerProfile.avatar_url}
                          alt={organizerProfile.full_name || "Organizador"}
                          className="w-12 h-12 rounded-lg object-cover border-2"
                          style={{ borderColor: eventPrimaryColor }}
                          loading="lazy"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: eventPrimaryColor }}
                        >
                          {(organizerProfile.full_name || "O").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{organizerProfile.full_name || "Organizador"}</p>
                          {isVerifiedOrganizer && <VerifiedBadge variant="icon" size="sm" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {followOrganizer.loading ? "—" : `${followOrganizer.followersCount} seguidores`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/profile/${organizerProfile.id}`)}
                      >
                        Ver perfil completo
                      </Button>
                      
                      {organizerProfile.id !== user?.id && (
                        <Button
                          variant={followOrganizer.isFollowing ? "outline" : "default"}
                          className="w-full"
                          style={!followOrganizer.isFollowing ? { backgroundColor: eventPrimaryColor } : undefined}
                          onClick={async () => {
                            if (!user) {
                              toast.error("Faça login para seguir organizadores");
                              navigate("/auth");
                              return;
                            }
                            try {
                              await followOrganizer.toggle();
                              toast.success(
                                followOrganizer.isFollowing
                                  ? "Você deixou de seguir o organizador."
                                  : "Agora você está seguindo o organizador!"
                              );
                            } catch (e: any) {
                              toast.error(e?.message || "Erro ao seguir organizador");
                            }
                          }}
                          disabled={followOrganizer.loading}
                        >
                          {followOrganizer.isFollowing ? "Deixar de seguir" : "Seguir"}
                        </Button>
                      )}
                    </div>
                  </Card>
                )}
                {training.is_private &&
                  Array.isArray(training.invited_tags) &&
                  training.invited_tags.length > 0 && (
                    <Card className="p-6 bg-card/80 border-border">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                        Equipes Convidadas
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Treino privado: apenas as TAGs abaixo podem se inscrever.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {training.invited_tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}
              </div>

              {/* Right column - sticky actions */}
              <div className="space-y-4 lg:sticky lg:top-4 h-fit">
                {/* Anchor so Overview buttons can scroll here */}
                <div id="event-info-section-anchor" />

                <Card className="p-6 bg-card/80 border-border">
                  <h3 className="font-semibold mb-4">Ações</h3>

                  {!isAuthed ? (
                    <div className="space-y-3">
                      <Button
                        onClick={() => navigate("/auth")}
                        className="w-full"
                        disabled={training.status !== "INSCRIÇÕES ABERTAS" || isFull}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {sessionExpired
                          ? "Sessão expirada — entrar novamente"
                          : training.status !== "INSCRIÇÕES ABERTAS"
                          ? "Inscrições Encerradas"
                          : isFull
                          ? "Treino Lotado"
                          : "Entrar para se inscrever"}
                      </Button>

                      {isFull && training.status === "INSCRIÇÕES ABERTAS" && (
                        <Button variant="outline" className="w-full" disabled>
                          Lista de espera (em breve)
                        </Button>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        {sessionExpired
                          ? "Sua sessão expirou. Faça login para continuar."
                          : "Faça login para inscrever sua equipe."}
                      </p>
                    </div>
                  ) : isOrganizer ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border bg-background/50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Você é o organizador deste treino — não é possível se inscrever.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setActiveTab("settings")}
                      >
                        Abrir Configurações
                      </Button>
                    </div>
                  ) : profile?.role === "player" ? (
                    <div className="space-y-3">
                      {!isRegistered ? (
                        <>
                          <Button
                            onClick={handleRegisterClick}
                            disabled={
                              actionLoading ||
                              isFull ||
                              training.status !== "INSCRIÇÕES ABERTAS"
                            }
                            className="w-full"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            {training.status !== "INSCRIÇÕES ABERTAS"
                              ? "Inscrições Encerradas"
                              : isFull
                              ? "Treino Lotado"
                              : "Inscrever Minha Equipe"}
                          </Button>

                          {isFull && training.status === "INSCRIÇÕES ABERTAS" && (
                            <div className="space-y-2">
                              {!isInWaitlist ? (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={handleJoinWaitlist}
                                  disabled={actionLoading || !myTeam}
                                >
                                  Entrar na waitlist ({waitlistCount})
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={handleLeaveWaitlist}
                                  disabled={actionLoading}
                                >
                                  Sair da waitlist ({waitlistCount})
                                </Button>
                              )}

                              {isInWaitlist && !isFull && (
                                <Button
                                  className="w-full"
                                  onClick={handleOpenClaimDialog}
                                  disabled={actionLoading}
                                >
                                  Pegar vaga (primeiro que clicar entra)
                                </Button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={handleUnregister}
                            disabled={actionLoading}
                            variant="destructive"
                            className="w-full"
                          >
                            {actionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                            Cancelar Inscrição
                          </Button>

                          {/* Painel de Check-in */}
                          {training?.datetime && (
                            <div className="rounded-lg border bg-background/50 p-3 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold">Janela de check-in</div>
                                  <div className="text-xs text-muted-foreground">
                                    Abre 1h antes e fecha 10min antes do horário do treino.
                                  </div>
                                </div>
                                <Badge variant={checkinWindow.canCheckIn ? "default" : "outline"} className="text-xs">
                                  {checkinWindow.canCheckIn ? "ABERTO" : "FECHADO"}
                                </Badge>
                              </div>

                              {(() => {
                                const dt = new Date(training.datetime);
                                const openAt = new Date(dt.getTime() - 60 * 60 * 1000);
                                const closeAt = new Date(dt.getTime() - 10 * 60 * 1000);
                                const now = new Date(nowTick);

                                const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");
                                const fmt = (ms: number) => {
                                  const total = Math.max(0, Math.floor(ms / 1000));
                                  const h = Math.floor(total / 3600);
                                  const m = Math.floor((total % 3600) / 60);
                                  const s = total % 60;
                                  return `${pad(h)}:${pad(m)}:${pad(s)}`;
                                };

                                const state = now < openAt ? "antes" : now > closeAt ? "depois" : "durante";
                                const remaining =
                                  state === "antes" ? openAt.getTime() - now.getTime() : closeAt.getTime() - now.getTime();

                                return (
                                  <div className="rounded-md bg-muted/40 p-3">
                                    <div className="text-xs text-muted-foreground">
                                      {state === "antes"
                                        ? "Abre em"
                                        : state === "durante"
                                        ? "Fecha em"
                                        : "Encerrado há"}
                                    </div>
                                    <div className="text-lg font-bold tabular-nums">{fmt(Math.abs(remaining))}</div>
                                  </div>
                                );
                              })()}

                              {!hasCheckedIn ? (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={handleCheckinClick}
                                  disabled={actionLoading || !checkinWindow.canCheckIn || !isTeamAdmin}
                                >
                                  Confirmar check-in
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={handleUndoCheckin}
                                  disabled={actionLoading}
                                >
                                  Remover check-in
                                </Button>
                              )}

                              {!checkinWindow.canCheckIn && (
                                <p className="text-xs text-muted-foreground">{checkinWindow.reason}</p>
                              )}
                              {checkinWindow.canCheckIn && !isTeamAdmin && (
                                <p className="text-xs text-muted-foreground">Somente admin da equipe pode confirmar.</p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {!myTeam && (
                        <p className="text-sm text-muted-foreground text-center">
                          Crie sua equipe para se inscrever
                        </p>
                      )}

                      <AlertDialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{checkinDialogTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{checkinDialogMessage}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogAction>Entendi</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Seu perfil não permite inscrição.
                    </p>
                  )}

                  {isFull && training.status === "INSCRIÇÕES ABERTAS" && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border bg-background/50 p-3">
                        <div className="text-sm font-semibold">Treino lotado</div>
                        <div className="text-xs text-muted-foreground">
                          0 vagas disponíveis • {confirmedTeamsCount}/{training.max_slots} times confirmados
                        </div>
                      </div>

                      {organizerProfile?.id && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => navigate(`/profile/${organizerProfile.id}`)}
                        >
                          Ver perfil do organizador
                        </Button>
                      )}

                      {organizerProfile?.id && organizerProfile.id !== user?.id ? (
                        <Button
                          variant={followOrganizer.isFollowing ? "outline" : "default"}
                          className="w-full"
                          onClick={async () => {
                            try {
                              await followOrganizer.toggle();
                              toast.success(
                                followOrganizer.isFollowing
                                  ? "Você deixou de seguir o organizador."
                                  : "Agora você está seguindo o organizador!"
                              );
                            } catch (e: any) {
                              toast.error(e?.message || "Erro ao seguir organizador");
                            }
                          }}
                          disabled={followOrganizer.loading}
                        >
                          {followOrganizer.isFollowing ? "Deixar de seguir" : "Seguir organizador"}
                        </Button>
                      ) : null}

                      {organizerUpcomingTrainings.length > 0 && (
                        <div className="rounded-lg border bg-background/50 p-3">
                          <div className="text-xs text-muted-foreground mb-2">
                            Próximos treinos deste organizador
                          </div>
                          <div className="space-y-2">
                            {organizerUpcomingTrainings.map((t: any) => (
                              <Button
                                key={t.id}
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => navigate(`/training/${t.id}`)}
                              >
                                <span className="truncate">{t.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {t.datetime ? format(new Date(t.datetime), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator className="my-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Vagas restantes:</span>
                      <span className="font-semibold">
                        {training.max_slots - confirmedTeamsCount}
                      </span>
                    </div>
                    {training.is_private && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Privado:</span>
                        <Badge variant="outline" className="text-xs">
                          Sim
                        </Badge>
                      </div>
                    )}
                  </div>

                  {(training.discord_link || training.whatsapp_link) && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        {training.discord_link && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(training.discord_link, "_blank")}
                            className="w-full gap-2"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Entrar no Discord
                          </Button>
                        )}
                        {training.whatsapp_link && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(training.whatsapp_link, "_blank")}
                            className="w-full gap-2"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </Card>

                {/* Tabela de pontos (regras) - só aparece quando já existe pontuação registrada */}
                {hasAnyScores && (
                  <PointsTableCard
                    pointsPerKill={training.points_per_kill}
                    pointsPerPosition={
                      Array.isArray(training.points_per_position) ? training.points_per_position : []
                    }
                    pointsPerPositionText={training.points_per_position_text}
                    primaryColor={eventPrimaryColor}
                  />
                )}

                {/* Regras / Pontuação / Ajuda */}
                <EventInfoSection
                  rules={training.rules}
                  pointsPerKill={training.points_per_kill}
                  pointsPerPosition={
                    Array.isArray(training.points_per_position) ? training.points_per_position : []
                  }
                  pointsPerPositionText={training.points_per_position_text}
                  discordLink={training.discord_link}
                  whatsappLink={training.whatsapp_link}
                  primaryColor={eventPrimaryColor}
                />
              </div>
            </div>
          </TabsContent>

           {/* Ranking Tab */}
           <TabsContent value="ranking" className="space-y-6">
             {!isAuthed ? (
               <LoginRequiredCard
                 title="Login necessário"
                 message="Faça login para visualizar o ranking completo do evento."
                 primaryColor={eventPrimaryColor}
               />
             ) : !hasAnyScores ? (
               <Card className="p-6 bg-card/80 border-border">
                 <div className="flex items-start gap-3">
                   <div className="mt-0.5">
                     <Info className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                     <div className="font-semibold">Por enquanto não há dados</div>
                     <div className="text-sm text-muted-foreground">
                       O ranking aparece automaticamente quando algum placar for lançado.
                     </div>
                   </div>
                 </div>
               </Card>
             ) : registeredTeams.length > 0 ? (
               <>
                 <Scoreboard
                   trainingId={id!}
                   teams={registeredTeams.map((r: any) => ({
                     id: r.teams.id,
                     name: r.teams.name,
                     tag: r.teams.tag,
                     logo_url: r.teams.logo_url,
                   }))}
                   primaryColor={eventPrimaryColor}
                 />

                 <MvpListCard
                   trainingId={id!}
                   teams={registeredTeams.map((r: any) => ({
                     id: r.teams.id,
                     name: r.teams.name,
                     tag: r.teams.tag,
                     logo_url: r.teams.logo_url,
                   }))}
                 />
               </>
             ) : (
               <Card className="p-6 bg-card/80 border-border">
                 <div className="text-sm text-muted-foreground">Nenhuma equipe inscrita ainda.</div>
               </Card>
             )}
           </TabsContent>

          {/* Settings tab - organizer only */}
          {isOrganizer && (
            <TabsContent value="settings" className="space-y-6">
              <TrainingSettingsTab
                trainingId={id!}
                userId={user.id}
                userEmail={user.email}
                training={training}
                registeredTeams={registeredTeams}
                primaryColor={eventPrimaryColor}
                onUpdated={fetchTrainingDetails}
              />
            </TabsContent>
          )}


          {/* Teams Tab */}
          <TabsContent value="teams">
            {!isAuthed ? (
              <LoginRequiredCard
                title="Login necessário"
                message="Faça login para visualizar as equipes inscritas neste evento."
                primaryColor={eventPrimaryColor}
              />
            ) : (
              <Card className="p-6 bg-card/80 border-border">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-xl font-bold" style={{ color: eventPrimaryColor }}>
                    Equipes Confirmadas ({confirmedTeamsCount})
                  </h2>
                  {/* Ações do organizador ficam na aba Configurações */}
                </div>

                {registeredTeams.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma equipe inscrita ainda</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {registeredTeams.map((registration: any) => (
                      <Card key={registration.id} className="p-4 bg-background/50">
                        <div className="flex items-start gap-3">
                          {registration.teams.logo_url && (
                            <img
                              src={registration.teams.logo_url}
                              alt={registration.teams.name}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-sm uppercase">{registration.teams.name}</h3>
                              {registration.slot_number && (
                                <Badge variant="secondary" className="text-xs">
                                  #{registration.slot_number}
                                </Badge>
                              )}
                              {registration.teams.is_external && (
                                <Badge variant="outline" className="text-xs border-primary text-primary">
                                  Convidado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground uppercase">[{registration.teams.tag}]</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <MatchesTab 
              trainingId={id!} 
              isOrganizer={isOrganizer}
              isAuthenticated={isAuthed}
              teams={registeredTeams.map((r: any) => ({
                id: r.teams.id,
                name: r.teams.name,
                tag: r.teams.tag,
                logo_url: r.teams.logo_url,
              }))}
              pointsPerKill={training.points_per_kill || 1}
              pointsPerPosition={Array.isArray(training.points_per_position) ? training.points_per_position : []}
              tableImageUrl={training.table_image_url}
              onScoresUpdated={fetchTrainingDetails}
              primaryColor={eventPrimaryColor}
            />
          </TabsContent>

          {/* Chat Tab */}
          {isAuthed && (isOrganizer || isRegistered) && (
            <TabsContent value="chat">
              <Card className="p-0 bg-card/80 border-border overflow-hidden">
                <div className="p-4 flex items-center gap-2 text-white" style={{ backgroundColor: eventPrimaryColor }}>
                  <MessageCircle className="w-5 h-5" />
                  <h2 className="font-semibold">Chat do Treino</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {isOrganizer ? "Organizador" : "Jogador"}
                  </Badge>
                </div>
                <div className="p-4">
                  <TrainingChat trainingId={id!} isOrganizer={isOrganizer} />
                </div>
              </Card>
            </TabsContent>
          )}

          {/* Live Tab */}
          {training.is_live && (
            <TabsContent value="live">
              <Card className="p-6 bg-card/80 border-border text-center">
                <Radio className="w-16 h-16 mx-auto mb-4 text-destructive animate-pulse" />
                <h2 className="text-2xl font-bold mb-4">🔴 Transmissão Ao Vivo</h2>
                {training.live_link ? (
                  <Button
                    onClick={() => window.open(training.live_link, "_blank")}
                    className="bg-destructive hover:bg-destructive/90 gap-2"
                    size="lg"
                  >
                    <Video className="w-5 h-5" />
                    Assistir à Live
                  </Button>
                ) : (
                  <p className="text-muted-foreground">Link da transmissão não disponível</p>
                )}
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

        {isAuthed && (
          <RegistrationConfirmDialog
            open={showConfirmDialog}
            onOpenChange={(open) => {
              setShowConfirmDialog(open);
              if (!open) setSelectedLineId("");
            }}
            onConfirm={handleRegisterConfirm}
            training={training}
            teamName={myTeam?.name || ""}
            loading={actionLoading}
            lines={myTeamLines}
            selectedLineId={selectedLineId}
            onChangeLine={setSelectedLineId}
          />
        )}

      {/* Floating Chat */}
      {isAuthed && (isOrganizer || isRegistered) && (
        <FloatingChat
          trainingId={id!}
          isOrganizer={isOrganizer}
          primaryColor={eventPrimaryColor}
        />
      )}
    </MainLayout>
  );
};

export default TrainingDetails;
