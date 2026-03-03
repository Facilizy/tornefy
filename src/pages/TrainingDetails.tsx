import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";

import { OrganizerBadge } from "@/components/OrganizerBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  Smartphone,
  MonitorSmartphone,
  FileText,
  HelpCircle as HelpIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { TrainingTabs } from "@/components/training/details/TrainingTabs";
import { OverviewTab } from "@/components/training/details/OverviewTab";
import { TeamsTab } from "@/components/training/details/TeamsTab";
import { MatchesTab } from "@/components/MatchesTab";
import { Scoreboard } from "@/components/Scoreboard";
import { FloatingChat } from "@/components/FloatingChat";
import { TrainingDetailsSkeleton } from "@/components/skeletons/TrainingDetailsSkeleton";
import { RegistrationConfirmDialog } from "@/components/RegistrationConfirmDialog";
import { PaymentComingSoon } from "@/components/payments/PaymentComingSoon";
import { GameAccountRequiredDialog } from "@/components/GameAccountRequiredDialog";
import { MvpListCard } from "@/components/training/MvpListCard";
import { TrainingSettingsTab } from "@/components/TrainingSettingsTab";
import { DynamicBanner } from "@/components/DynamicBanner";
import TornefyBannerMark from "@/components/TornefyBannerMark";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";
import { ScrimPaymentBadges } from "@/components/scrims/ScrimPaymentBadges";
import { MinimumTeamsProgress } from "@/components/training/MinimumTeamsProgress";
import { TrainingQnaSection } from "@/components/training/TrainingQnaSection";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";

import { useTrainingData } from "@/hooks/useTrainingData";
import { useMyTeam } from "@/hooks/useMyTeam";
import { useTrainingRegistration } from "@/hooks/useTrainingRegistration";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganizerFollow } from "@/hooks/useOrganizerFollow";
import { TrainingChat } from "@/components/TrainingChat";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TrainingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [nowTick] = useState(() => Date.now());

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const {
    training,
    loading: trainingLoading,
    organizerProfile,
    isVerifiedOrganizer,
    isVerifiedOrganizerRole,
    registeredTeamsCount,
    registeredTeams,
    registeredTeamsLoading,
    isRegistered,
    trainingAccess,
    scrimGroups,
    scrimGroupTeams,
    waitlistCount,
    isInWaitlist,
    hasCheckedIn,
    refetch,
  } = useTrainingData(id, user?.id);

  const { myTeam, myTeamLines } = useMyTeam(user?.id);

  const { role: userRole } = useUserRole(user?.id);
  const followOrganizer = useOrganizerFollow(organizerProfile?.id);

  const registration = useTrainingRegistration({
    training,
    user,
    myTeam,
    myTeamLines,
    trainingAccess,
    registeredTeamsCount,
    onSuccess: refetch,
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showScoresDialog, setShowScoresDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, [location.search]);

  // Safe parsing of points BEFORE early return to satisfy Rules of Hooks
  const parsedPointsPerPosition = useMemo(() => {
    try {
      const raw = training?.points_per_position;
      if (!raw) return [];
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      console.error("Error parsing points_per_position:", e);
      return [];
    }
  }, [training?.points_per_position]);

  const organizerVerified = isVerifiedOrganizer || isVerifiedOrganizerRole;
  const isOrganizer = userRole === "admin" || (training?.organizer_id && user?.id && training.organizer_id === user.id);

  if (trainingLoading || !training) {
    return <TrainingDetailsSkeleton />;
  }

  // Variables that depend on training being loaded
  const isFull = registeredTeamsCount >= (training?.max_slots || 0);
  const eventPrimaryColor = training?.primary_color || "#9146FF";

  const checkinWindow = (() => {
    const dt = training?.datetime ? new Date(training.datetime) : null;
    if (!dt) return { canCheckIn: false, reason: "Treino sem horário definido." };

    const now = new Date(nowTick);
    const openAt = new Date(dt.getTime() - 60 * 60 * 1000);
    const closeAt = new Date(dt.getTime() - 10 * 60 * 1000);

    if (now < openAt) return { canCheckIn: false, reason: "O check-in abre 1h antes do evento." };
    if (now > closeAt) return { canCheckIn: false, reason: "O check-in já foi encerrado (fecha 10min antes)." };
    return { canCheckIn: true, reason: "" };
  })();

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Mobile": return <Smartphone className="w-5 h-5" />;
      case "PC": return <Monitor className="w-5 h-5" />;
      case "Misto": return <MonitorSmartphone className="w-5 h-5" />;
      case "Console": return <Gamepad2 className="w-5 h-5" />;
      default: return <MonitorSmartphone className="w-5 h-5" />;
    }
  };

  const getGameName = (game?: string) => {
    const names: Record<string, string> = {
      free_fire: "Free Fire",
      blood_strike: "Blood Strike",
      farlight_84: "Farlight 84",
      prime_rush: "Prime Rush",
      pubg_mobile: "PUBG Mobile",
    };
    return game ? names[game] || game : "";
  };

  const getGameLogo = (game?: string) => {
    const logos: Record<string, string> = {
      free_fire: "/game-logos/free-fire.png",
      blood_strike: "/game-logos/blood-strike.png",
      farlight_84: "/game-logos/farlight-84.png",
      prime_rush: "/game-logos/prime-rush.png",
      pubg_mobile: "/game-logos/pubg-mobile.png",
    };
    return game ? logos[game] || "" : "";
  };

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <main className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <DynamicBanner
          bannerUrl={training.banner_url || undefined}
          title={training.name}
          primaryColor={training.primary_color || undefined}
          secondaryColor={training.secondary_color || undefined}
          heightClassName="h-[260px] sm:h-[340px] lg:h-[420px]"
          className="rounded-2xl mb-6"
          fallback={<TornefyBannerMark className="w-56 text-foreground/10" />}
        >
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="flex gap-2">
              {training.is_live && (
                <Badge variant="destructive" className="backdrop-blur-sm">
                  <Radio className="w-3 h-3 mr-1" />
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
              <TrainingStatusBadge status={training.status} />
              {training.is_live && (
                <Badge variant="destructive" className="backdrop-blur-sm">
                  <Radio className="w-3 h-3 mr-1" />
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
                  {organizerVerified && <OrganizerBadge variant="icon" size="sm" />}
                </button>
              </div>
            )}
          </div>
        </DynamicBanner>

        <div className="mt-8">
          <TrainingTabs
            training={training}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showChat={true}
            isOrganizer={isOrganizer}
          >
            <div className={activeTab === "overview" ? "block" : "hidden"}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
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
                          {training.datetime ? format(new Date(training.datetime), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-background/50 p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                          Horário
                        </div>
                        <div className="mt-2 font-semibold text-sm">
                          {training.datetime ? format(new Date(training.datetime), "HH:mm", { locale: ptBR }) : "—"}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-background/50 p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                          Times confirmados
                        </div>
                        <div className="mt-2 font-semibold text-sm">
                          {registeredTeamsCount}/{training.max_slots}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-background/50 p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Trophy className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                          Rodadas
                        </div>
                        <div className="mt-2 font-semibold text-sm">{training.rounds || "—"}</div>
                      </div>

                      <div className="rounded-xl border bg-background/50 p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Gamepad2 className="w-4 h-4" style={{ color: eventPrimaryColor }} />
                          Modo
                        </div>
                        <div className="mt-2 font-semibold text-sm">{training.mode || "—"}</div>
                      </div>

                      <div className="rounded-xl border bg-background/50 p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getPlatformIcon(training.platform)}
                          Plataforma
                        </div>
                        <div className="mt-2 font-semibold text-sm">{training.platform || "—"}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <MinimumTeamsProgress
                        confirmedTeams={registeredTeamsCount}
                        maxTeams={training.max_slots || 0}
                        primaryColor={eventPrimaryColor}
                      />
                    </div>

                    <div className="mt-8 space-y-8">
                      {training.important_info && (
                        <div className="space-y-3">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Info className="w-5 h-5 text-yellow-500" />
                            Informações Importantes
                          </h3>
                          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-muted-foreground whitespace-pre-wrap">
                            {training.important_info}
                          </div>
                        </div>
                      )}

                      <TrainingQnaSection
                        trainingId={id!}
                        userId={user?.id}
                        canAnswer={!!user?.id && (userRole === "organizer" || userRole === "admin")}
                        canModerate={!!user?.id && (userRole === "organizer" || userRole === "admin")}
                        primaryColor={training?.primary_color || undefined}
                      />
                    </div>
                  </Card>
                </div>

                <div className="space-y-4 lg:sticky lg:top-4 h-fit">
                  <Card className="p-6 bg-card/80 border-border">
                    <h3 className="font-semibold mb-4">Ações</h3>

                    <div className="space-y-3">
                      {((training?.entry_fee_coins || 0) > 0 || (training?.prize_coins || 0) > 0 || training?.prize) && (
                        <div className="mb-4">
                          <ScrimPaymentBadges
                            entryFeeCoins={training.entry_fee_coins}
                            prizeCoins={(training as any).prize_coins}
                            prizeText={training.prize}
                            primaryColor={training.primary_color || undefined}
                            secondaryColor={training.secondary_color || undefined}
                          />
                        </div>
                      )}

                      {!user ? (
                        <Button onClick={() => navigate("/auth")} className="w-full">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Entrar para se inscrever
                        </Button>
                      ) : userRole === "organizer" && String(training.organizer_id) === String(user.id) ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setActiveTab("settings")}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Abrir Configurações
                        </Button>
                      ) : (
                        <>
                          {!isRegistered ? (
                            <>
                              <Button
                                onClick={registration.handleRegisterClick}
                                disabled={registration.actionLoading || (isFull && !isInWaitlist)}
                                className="w-full"
                              >
                                {registration.actionLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                {isFull ? "Treino Lotado" : "Inscrever Minha Equipe"}
                              </Button>

                              {isFull && training.status === "INSCRIÇÕES ABERTAS" && (
                                <div className="space-y-2 mt-2">
                                  {!isInWaitlist ? (
                                    <Button
                                      variant="outline"
                                      className="w-full"
                                      onClick={registration.handleJoinWaitlist}
                                      disabled={registration.actionLoading}
                                    >
                                      Entrar na lista de espera ({waitlistCount})
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={registration.handleLeaveWaitlist}
                                        disabled={registration.actionLoading}
                                      >
                                        Sair da lista de espera
                                      </Button>
                                      {!isFull && (
                                        <Button
                                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                                          onClick={registration.handleClaimSlot}
                                          disabled={registration.actionLoading}
                                        >
                                          Pegar vaga agora!
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg mb-2">
                                <CheckCircle className="w-5 h-5 text-primary" />
                                <span className="text-sm font-medium">Equipe Inscrita</span>
                              </div>

                              {!hasCheckedIn ? (
                                <Button
                                  onClick={registration.handleCheckin}
                                  disabled={registration.actionLoading || !checkinWindow.canCheckIn}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {registration.actionLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                  )}
                                  Confirmar Check-in
                                </Button>
                              ) : (
                                <Button
                                  onClick={registration.handleUndoCheckin}
                                  disabled={registration.actionLoading}
                                  variant="outline"
                                  className="w-full border-green-600/50 text-green-600"
                                >
                                  Check-in Realizado (Desfazer)
                                </Button>
                              )}

                              <Button
                                onClick={registration.handleUnregister}
                                disabled={registration.actionLoading}
                                variant="destructive"
                                className="w-full"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancelar Inscrição
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2 h-12 bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/60"
                      onClick={() => setShowRulesDialog(true)}
                    >
                      <FileText className="w-4 h-4" />
                      Regras {(training.rules?.length || 0) > 0 && `(${(training.rules || "").split("\n").length})`}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2 h-12 bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/60"
                      onClick={() => setShowScoresDialog(true)}
                    >
                      <Trophy className="w-4 h-4" />
                      Pontuação
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2 h-12 bg-card/40 backdrop-blur-sm border-border/50 hover:bg-card/60"
                      onClick={() => setShowHelpDialog(true)}
                    >
                      <HelpIcon className="w-4 h-4" />
                      Ajuda
                    </Button>
                  </div>

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
                          <div className="w-12 h-12 rounded-lg border border-border bg-background/40 flex items-center justify-center">
                            <DefaultAvatarMark className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{organizerProfile.full_name || "Organizador"}</p>
                            {organizerVerified && <OrganizerBadge variant="icon" size="sm" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            @{organizerProfile.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/profile/${organizerProfile.id}`)}
                      >
                        Ver perfil completo
                      </Button>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            <div className={activeTab === "matches" ? "block" : "hidden"}>
              <MatchesTab
                trainingId={training.id}
                isOrganizer={isOrganizer}
                isAuthenticated={!!user}
                teams={registeredTeams.map((rt: any) => rt.teams).filter(Boolean)}
                pointsPerKill={training.points_per_kill || 0}
                pointsPerPosition={parsedPointsPerPosition}
                onScoresUpdated={refetch}
                primaryColor={training.primary_color || undefined}
              />
            </div>

            <div className={activeTab === "teams" ? "block" : "hidden"}>
              <TeamsTab
                loading={registeredTeamsLoading}
                registeredTeams={registeredTeams}
                scrimGroups={scrimGroups}
                scrimGroupTeams={scrimGroupTeams}
                useGroups={!!training.use_groups}
                maxSlots={training.max_slots || 0}
                invitedTags={training.invited_tags as string[]}
              />
            </div>

            <div className={activeTab === "ranking" ? "block" : "hidden"}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Scoreboard
                    trainingId={training.id}
                    teams={registeredTeams.map((rt: any) => rt.teams).filter(Boolean)}
                    primaryColor={training.primary_color || undefined}
                  />
                </div>
                <div>
                  <MvpListCard
                    trainingId={training.id}
                    teams={registeredTeams.map((rt: any) => rt.teams).filter(Boolean)}
                  />
                </div>
              </div>
            </div>

            <div className={activeTab === "chat" ? "block" : "hidden"}>
              <TrainingChat
                trainingId={training.id}
                isOrganizer={isOrganizer}
                organizerName={organizerProfile?.full_name}
                organizerAvatarUrl={organizerProfile?.avatar_url}
              />
            </div>

            <div className={activeTab === "settings" ? "block" : "hidden"}>
              {isOrganizer ? (
                <TrainingSettingsTab
                  trainingId={training.id}
                  userId={user?.id || ""}
                  userEmail={user?.email}
                  training={training}
                  registeredTeams={registeredTeams}
                  primaryColor={training.primary_color || "#9146FF"}
                  onUpdated={refetch}
                />
              ) : (
                <div className="p-8 text-center max-w-2xl mx-auto mt-10 space-y-4 bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl">
                  <Settings className="w-12 h-12 mx-auto text-primary mb-4" />
                  <h2 className="text-2xl font-bold">Acesso Restrito</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap max-w-lg mx-auto">
                    Apenas o organizador e administradores podem acessar as configurações deste treino.
                  </p>
                </div>
              )}
            </div>
          </TrainingTabs>
        </div>
      </main>

      <FloatingChat trainingId={training.id} isOrganizer={isOrganizer} />

      <RegistrationConfirmDialog
        open={registration.showConfirmDialog}
        onOpenChange={registration.setShowConfirmDialog}
        training={training}
        teamName={myTeam?.name || ""}
        lines={myTeamLines}
        selectedLineId={registration.selectedLineId}
        onChangeLine={registration.setSelectedLineId}
        onConfirm={registration.handleRegisterConfirm}
        loading={registration.actionLoading}
      />

      <Dialog
        open={registration.entryFeeDialogOpen || registration.planDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            registration.setEntryFeeDialogOpen(false);
            registration.setPlanDialogOpen(false);
          }
        }}
      >
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Pagamentos em Breve</DialogTitle>
          </DialogHeader>
          <PaymentComingSoon
            description="O sistema de pagamentos em TorneCoins (taxa de entrada e assinaturas) estará disponível em breve. Aguarde!"
          />
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                registration.setEntryFeeDialogOpen(false);
                registration.setPlanDialogOpen(false);
              }}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GameAccountRequiredDialog
        open={registration.missingGameDialogOpen}
        onOpenChange={registration.setMissingGameDialogOpen}
        gameId={registration.missingGameDialogGameId}
        missingCount={registration.missingGameDialogCount}
        onGoIntegrations={() => navigate("/profile/edit?section=dados")}
      />

      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Regras do Treino
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground leading-relaxed max-h-[60vh] overflow-y-auto pr-2 space-y-3">
            {training.rules ? (
              training.rules.split("\n").filter(line => line.trim().length > 0).map((line, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="font-bold text-primary min-w-[20px]">{idx + 1}.</span>
                  <span className="flex-1 whitespace-pre-wrap">{line}</span>
                </div>
              ))
            ) : (
              <p>Nenhuma regra específica cadastrada para este treino.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showScoresDialog} onOpenChange={setShowScoresDialog}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Sistema de Pontuação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {!training ? (
              <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold text-lg">Pontos por Abate</h4>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-sm">Cada abate (kill) vale:</span>
                    <span className="text-2xl font-black" style={{ color: eventPrimaryColor }}>
                      {training.points_per_kill || 0} pts
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-lg">Pontos por Posição</h4>
                  <div className="border rounded-xl overflow-hidden bg-background/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left">Posição</th>
                          <th className="p-2 text-right">Pontos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedPointsPerPosition.length === 0 ? (
                          <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">Nenhuma pontuação definida.</td></tr>
                        ) : (
                          parsedPointsPerPosition.slice(0, 12).map((pts, i) => {
                            let ptsValue: number | string = 0;
                            if (pts === null || pts === undefined) {
                              ptsValue = 0;
                            } else if (typeof pts === 'object') {
                              ptsValue = (pts as any).points ?? (pts as any).value ?? 0;
                            } else {
                              ptsValue = pts;
                            }
                            return (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="p-2 font-bold">{i + 1}º</td>
                                <td className="p-2 text-right font-mono">
                                  {Number(ptsValue)} pts
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpIcon className="w-5 h-5 text-primary" />
              Ajuda e Suporte
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <h4 className="font-bold text-base">Inscrição</h4>
              <p className="text-muted-foreground">
                Para participar, você deve ter uma equipe cadastrada e com a formação mínima exigida para o jogo.
                Certifique-se de preencher os IDs dos jogadores corretamente.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-base">Check-in</h4>
              <p className="text-muted-foreground">
                O check-in abre 1 hora antes do início do treino e fecha 10 minutos antes.
                Equipes que não confirmarem o check-in serão removidas para dar lugar à lista de espera.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-base">Sistema Automático</h4>
              <p className="text-muted-foreground">
                O placar é atualizado conforme o organizador insere os dados das quedas.
                O ranking final é calculado automaticamente com base no sistema de pontuação definido.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-base">Problemas?</h4>
              <p className="text-muted-foreground">
                Utilize o Chat ou a seção de Perguntas e Respostas na aba Visão Geral para falar com o organizador.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default TrainingDetails;
