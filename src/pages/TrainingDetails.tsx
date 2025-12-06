import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Users,
  Monitor,
  Gamepad2,
  Trophy,
  Target,
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { TrainingChat } from "@/components/TrainingChat";
import { RegistrationConfirmDialog } from "@/components/RegistrationConfirmDialog";
import { ExternalTeamDialog } from "@/components/ExternalTeamDialog";
import { AddExistingExternalTeamDialog } from "@/components/AddExistingExternalTeamDialog";
import { ScoreManagementDialog } from "@/components/ScoreManagementDialog";
import { Scoreboard } from "@/components/Scoreboard";
import { SlotReorderDialog } from "@/components/SlotReorderDialog";
import { MatchesTab } from "@/components/MatchesTab";
import { SaveTemplateDialog } from "@/components/SaveTemplateDialog";
import { FloatingChat } from "@/components/FloatingChat";

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
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([]);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && id) {
      fetchTrainingDetails();
      fetchMyTeam();
    }
  }, [user, id]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchProfile(session.user.id);
    } else {
      navigate("/auth");
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const fetchTrainingDetails = async () => {
    try {
      setLoading(true);
      const { data: trainingData, error: trainingError } = await supabase
        .from("trainings")
        .select("*")
        .eq("id", id)
        .single();

      if (trainingError) throw trainingError;
      setTraining(trainingData);

      const { data: registrationsData, error: registrationsError } =
        await supabase
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
            is_external,
            team_members (
              id,
              player_name,
              game_id,
              discord,
              function
            )
          )
        `
          )
          .eq("training_id", id);

      if (registrationsError) throw registrationsError;
      setRegisteredTeams(registrationsData || []);

      if (user) {
        const myRegistration = registrationsData?.find((reg: any) =>
          reg.teams?.owner_id === user.id
        );
        setIsRegistered(!!myRegistration);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar detalhes do treino");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeam = async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setMyTeam(data);
  };

  const handleRegisterClick = async () => {
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

    const { data: blacklistCount, error: countError } = await supabase
      .rpc("count_active_blacklists_from_different_organizers", {
        _team_tag: myTeam.tag
      });

    if (!countError && blacklistCount && blacklistCount >= 3) {
      toast.error("⚠️ ATENÇÃO: Sua equipe possui 3 ou mais blacklists de organizadores diferentes.", {
        duration: 6000,
      });
    }

    const { data: members } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", myTeam.id);

    const minMembers: { [key: string]: number } = {
      Solo: 1,
      Duo: 2,
      Squad: 4,
    };

    const required = minMembers[training.mode] || 1;
    if (!members || members.length < required) {
      toast.error(
        `Sua equipe precisa ter pelo menos ${required} jogador(es) para o modo ${training.mode}!`
      );
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

    if (training.status === "INSCRIÇÕES ENCERRADAS" || training.status === "EM ANDAMENTO" || training.status === "FINALIZADO") {
      toast.error("As inscrições para este treino estão encerradas!");
      return;
    }

    if (registeredTeams.length >= training.max_slots) {
      toast.error("Este treino já está lotado!");
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleRegisterConfirm = async () => {
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
          .map(r => r.slot_number)
          .filter(s => s !== null)
          .sort((a, b) => a - b);
        
        for (let i = 1; i <= training.max_slots; i++) {
          if (!usedSlots.includes(i)) {
            nextSlot = i;
            break;
          }
        }
      }
      
      const { error } = await supabase.from("training_registrations").insert({
        training_id: id,
        team_id: myTeam.id,
        slot_number: nextSlot
      });

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

  const isOrganizer = profile?.role === "organizer" && training?.organizer_id === user?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!training) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Treino não encontrado</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const getPlatformIcon = (platform: string) => {
    return platform === "PC" || platform === "Misto" ? (
      <Monitor className="w-5 h-5" />
    ) : (
      <Gamepad2 className="w-5 h-5" />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Banner - Fixed height 400px for page banner */}
        <div className="relative h-[200px] sm:h-[300px] lg:h-[400px] rounded-2xl overflow-hidden mb-6">
          {training.banner_url ? (
            <img
              src={training.banner_url}
              alt={training.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <Trophy className="w-20 h-20 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          {/* Status badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {training.status && (
              <Badge variant="secondary" className="backdrop-blur-sm">
                {training.status}
              </Badge>
            )}
            {training.is_live && (
              <Badge className="bg-destructive backdrop-blur-sm">
                ● AO VIVO
              </Badge>
            )}
          </div>
          
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 right-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 uppercase">
              {training.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="backdrop-blur-sm">
                {getPlatformIcon(training.platform)}
                <span className="ml-1">{training.platform}</span>
              </Badge>
              <Badge variant="outline" className="backdrop-blur-sm border-white/30 text-white">
                {training.mode}
              </Badge>
              <Badge className="bg-primary/80 backdrop-blur-sm">
                {format(new Date(training.datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 bg-card/80 border border-border p-1 h-auto">
            <TabsTrigger value="overview" className="gap-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Medal className="w-4 h-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Equipes</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Swords className="w-4 h-4" />
              <span className="hidden sm:inline">Partidas</span>
            </TabsTrigger>
            {(isOrganizer || isRegistered) && (
              <TabsTrigger value="chat" className="gap-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
            )}
            {training.is_live && (
              <TabsTrigger value="live" className="gap-2 py-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                <Radio className="w-4 h-4" />
                <span className="hidden sm:inline">Ao Vivo</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 bg-card/80 border-border">
                  <h2 className="text-xl font-bold mb-4 gradient-text">Informações do Treino</h2>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="font-semibold text-sm">
                          {format(new Date(training.datetime), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Vagas</p>
                        <p className="font-semibold text-sm">
                          {registeredTeams.length}/{training.max_slots}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Rodadas</p>
                        <p className="font-semibold text-sm">{training.rounds}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-primary" />
                      Sistema de Pontuação
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Abates: <span className="text-primary font-semibold">{training.points_per_kill} pt(s)</span>
                    </p>
                    {training.points_per_position_text && (
                      <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                        {training.points_per_position_text}
                      </div>
                    )}
                  </div>
                </Card>

                {training.prize && (
                  <Card className="p-6 bg-card/80 border-border">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      Premiação
                    </h3>
                    <p className="text-muted-foreground whitespace-pre-wrap bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm">
                      {training.prize}
                    </p>
                  </Card>
                )}

                {training.important_info && (
                  <Card className="p-6 bg-card/80 border-border border-l-4 border-l-primary">
                    <h3 className="font-semibold mb-3 text-primary">⚠️ Informações Importantes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                      {training.important_info}
                    </p>
                  </Card>
                )}

                {training.rules && (
                  <Card className="p-6 bg-card/80 border-border">
                    <h3 className="font-semibold mb-3">📋 Regras do Treino</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                      {training.rules}
                    </p>
                  </Card>
                )}
              </div>

              {/* Sidebar - Actions */}
              <div className="space-y-4">
                <Card className="p-6 bg-card/80 border-border">
                  <h3 className="font-semibold mb-4">Ações</h3>

                  {profile?.role === "player" && (
                    <div className="space-y-3">
                      {!isRegistered ? (
                        <Button
                          onClick={handleRegisterClick}
                          disabled={
                            actionLoading ||
                            registeredTeams.length >= training.max_slots ||
                            training.status !== "INSCRIÇÕES ABERTAS"
                          }
                          className="w-full bg-gradient-primary"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          {training.status !== "INSCRIÇÕES ABERTAS"
                            ? "Inscrições Encerradas"
                            : registeredTeams.length >= training.max_slots
                            ? "Treino Lotado"
                            : "Inscrever Minha Equipe"}
                        </Button>
                      ) : (
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
                      )}

                      {!myTeam && (
                        <p className="text-sm text-muted-foreground text-center">
                          Crie sua equipe para se inscrever
                        </p>
                      )}
                    </div>
                  )}

                  {isOrganizer && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-2">
                        <ExternalTeamDialog 
                          trainingId={id!}
                          organizerId={user.id}
                          onTeamCreated={fetchTrainingDetails}
                        />
                        <AddExistingExternalTeamDialog
                          trainingId={id!}
                          organizerId={user.id}
                          onTeamAdded={fetchTrainingDetails}
                        />
                      </div>
                      <ScoreManagementDialog
                        trainingId={id!}
                        teams={registeredTeams.map((r: any) => ({
                          id: r.teams.id,
                          name: r.teams.name,
                          tag: r.teams.tag,
                          logo_url: r.teams.logo_url,
                        }))}
                        pointsPerKill={training.points_per_kill || 1}
                        pointsPerPosition={Array.isArray(training.points_per_position) ? training.points_per_position : []}
                        onScoresUpdated={fetchTrainingDetails}
                      />
                      <SaveTemplateDialog
                        training={training}
                        organizerId={user.id}
                      />
                    </div>
                  )}

                  <Separator className="my-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="text-xs">
                        {training.status || "INSCRIÇÕES ABERTAS"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Vagas Restantes:</span>
                      <span className="font-semibold">
                        {training.max_slots - registeredTeams.length}
                      </span>
                    </div>
                  </div>

                  {training.discord_link && (
                    <>
                      <Separator className="my-4" />
                      <Button
                        variant="outline"
                        onClick={() => window.open(training.discord_link, "_blank")}
                        className="w-full gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Entrar no Discord
                      </Button>
                    </>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking">
            <Scoreboard 
              trainingId={id!} 
              teams={registeredTeams.map((r: any) => ({
                id: r.teams.id,
                name: r.teams.name,
                tag: r.teams.tag,
                logo_url: r.teams.logo_url,
              }))}
            />
            {registeredTeams.length === 0 && (
              <Card className="p-12 text-center bg-card/80">
                <Medal className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma pontuação registrada ainda</p>
              </Card>
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <Card className="p-6 bg-card/80 border-border">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold gradient-text">
                  Equipes Confirmadas ({registeredTeams.length})
                </h2>
                {isOrganizer && (
                  <SlotReorderDialog
                    trainingId={id!}
                    onSlotsUpdated={fetchTrainingDetails}
                  />
                )}
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
                            <h3 className="font-semibold text-sm uppercase">
                              {registration.teams.name}
                            </h3>
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
                          <p className="text-xs text-muted-foreground uppercase">
                            [{registration.teams.tag}]
                          </p>
                          
                          {registration.teams.team_members && registration.teams.team_members.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {registration.teams.team_members.slice(0, 4).map((member: any) => (
                                <p key={member.id} className="text-xs text-muted-foreground">
                                  {member.player_name} • {member.function}
                                </p>
                              ))}
                              {registration.teams.team_members.length > 4 && (
                                <p className="text-xs text-primary">
                                  +{registration.teams.team_members.length - 4} mais
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            <MatchesTab 
              trainingId={id!} 
              isOrganizer={isOrganizer}
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
            />
          </TabsContent>

          {/* Chat Tab */}
          {(isOrganizer || isRegistered) && (
            <TabsContent value="chat">
              <Card className="p-0 bg-card/80 border-border overflow-hidden">
                <div className="bg-gradient-primary p-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <h2 className="font-semibold">Chat do Treino</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {isOrganizer ? "Organizador" : "Jogador"}
                  </Badge>
                </div>
                <div className="p-4">
                  <TrainingChat 
                    trainingId={id!} 
                    isOrganizer={isOrganizer}
                  />
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

      <RegistrationConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleRegisterConfirm}
        training={training}
        teamName={myTeam?.name || ""}
        loading={actionLoading}
      />

      {/* Floating Chat */}
      {(isOrganizer || isRegistered) && (
        <FloatingChat trainingId={id!} isOrganizer={isOrganizer} />
      )}
    </div>
  );
};

export default TrainingDetails;
