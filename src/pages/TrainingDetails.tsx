import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { TrainingChat } from "@/components/TrainingChat";
import { RegistrationConfirmDialog } from "@/components/RegistrationConfirmDialog";
import { ExternalTeamDialog } from "@/components/ExternalTeamDialog";

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

    // Check if team is banned (temporary ban)
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

    // Check if team has 3+ blacklists from different organizers
    const { data: blacklistCount, error: countError } = await supabase
      .rpc("count_active_blacklists_from_different_organizers", {
        _team_tag: myTeam.tag
      });

    if (!countError && blacklistCount && blacklistCount >= 3) {
      toast.error("⚠️ ATENÇÃO: Sua equipe possui 3 ou mais blacklists de organizadores diferentes. Isso pode afetar futuras inscrições.", {
        duration: 6000,
      });
    }

    // Validar número mínimo de membros baseado no modo
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

    // Check blacklist from this organizer
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

    // Check private training
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
      
      // Find the next available slot number
      const { data: existingRegistrations } = await supabase
        .from("training_registrations")
        .select("slot_number")
        .eq("training_id", id!)
        .order("slot_number", { ascending: true });

      let nextSlot = 1;
      if (existingRegistrations && existingRegistrations.length > 0) {
        // Find gaps in slot numbers or get the next number
        const usedSlots = existingRegistrations
          .map(r => r.slot_number)
          .filter(s => s !== null)
          .sort((a, b) => a - b);
        
        // Find first gap
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

      if (error) {
        console.error("Error unregistering:", error);
        throw error;
      }
      toast.success("Inscrição cancelada!");
      fetchTrainingDetails();
    } catch (error: any) {
      console.error("Unregister error:", error);
      toast.error(error.message || "Erro ao cancelar inscrição");
    } finally {
      setActionLoading(false);
    }
  };

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

      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Banner */}
        <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden mb-8 animate-fade-in">
          {training.banner_url ? (
            <img
              src={training.banner_url}
              alt={training.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <Trophy className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
              {training.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
              <h2 className="text-2xl font-bold mb-4 gradient-text">
                Informações do Treino
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data e Hora</p>
                    <p className="font-semibold text-sm sm:text-base">
                      {format(
                        new Date(training.datetime),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vagas</p>
                    <p className="font-semibold text-sm sm:text-base">
                      {registeredTeams.length}/{training.max_slots}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getPlatformIcon(training.platform)}
                  <div>
                    <p className="text-sm text-muted-foreground">Plataforma</p>
                    <Badge variant="secondary" className="text-xs sm:text-sm">{training.platform}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Modo</p>
                    <Badge variant="outline" className="text-xs sm:text-sm">{training.mode}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Quedas</p>
                    <p className="font-semibold text-sm sm:text-base">{training.rounds}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm sm:text-base">Pontuação</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Abates: {training.points_per_kill} ponto(s)
                </p>
                {training.points_per_position_text && (
                  <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    <p className="font-semibold mb-1">Pontos por Colocação:</p>
                    {training.points_per_position_text}
                  </div>
                )}
              </div>

              {training.prize && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm sm:text-base">Premiação</span>
                    </h3>
                    <p className="text-muted-foreground whitespace-pre-wrap bg-gradient-primary/5 p-3 sm:p-4 rounded-lg border border-primary/20 text-sm">
                      {training.prize}
                    </p>
                  </div>
                </>
              )}

              {training.important_info && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold mb-3 text-primary text-sm sm:text-base">⚠️ Informações Importantes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap bg-primary/5 p-3 sm:p-4 rounded-lg border border-primary/20 text-sm">
                      {training.important_info}
                    </p>
                  </div>
                </>
              )}

              {training.rules && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold mb-3 text-sm sm:text-base">Regras do Treino</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                      {training.rules}
                    </p>
                  </div>
                </>
              )}

              {training.table_image_url && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold mb-3 text-sm sm:text-base">📊 Tabela de Resultados</h3>
                    <img 
                      src={training.table_image_url} 
                      alt="Tabela de resultados"
                      className="w-full rounded-lg border border-border"
                    />
                  </div>
                </>
              )}

            </Card>

            {/* Registered Teams */}
            <Card className="p-4 sm:p-6 backdrop-blur-sm bg-card/80 border-border">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 gradient-text">
                Equipes Confirmadas ({registeredTeams.length})
              </h2>

              {registeredTeams.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  Nenhuma equipe inscrita ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {registeredTeams.map((registration: any) => (
                    <Card
                      key={registration.id}
                      className="p-3 sm:p-4 bg-background/50"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        {registration.teams.logo_url && (
                          <img
                            src={registration.teams.logo_url}
                            alt={registration.teams.name}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg">
                              {registration.teams.name}
                            </h3>
                            {registration.slot_number && (
                              <Badge variant="secondary" className="text-xs">
                                Slot {registration.slot_number}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                            [{registration.teams.tag}]
                          </p>
                          
                          {registration.teams.team_members && registration.teams.team_members.length > 0 ? (
                            <div className="space-y-2">
                              {registration.teams.team_members.map((member: any) => (
                                <div key={member.id} className="bg-background/50 p-2 rounded-lg border border-border/50">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0">
                                    <div>
                                      <p className="font-medium text-xs sm:text-sm">{member.player_name}</p>
                                      <p className="text-xs text-muted-foreground">{member.function}</p>
                                    </div>
                                    <div className="sm:text-right">
                                      <p className="text-xs text-muted-foreground">ID: {member.game_id}</p>
                                      <p className="text-xs text-muted-foreground">Discord: {member.discord}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-muted-foreground">Nenhum membro cadastrado</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar - Actions */}
          <div>
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border sticky top-24">
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
                    className="w-full bg-gradient-primary hover:shadow-glow-strong"
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

              {/* External Team Button for Organizer */}
              {profile?.role === "organizer" && training.organizer_id === user?.id && (
                <ExternalTeamDialog 
                  trainingId={id!}
                  organizerId={user.id}
                  onTeamCreated={fetchTrainingDetails}
                />
              )}

              <Separator className="my-6" />

              {/* Chat Section */}
              {(profile?.role === "organizer" && training.organizer_id === user?.id) || isRegistered ? (
                <>
                  <TrainingChat 
                    trainingId={id!} 
                    isOrganizer={profile?.role === "organizer" && training.organizer_id === user?.id}
                  />
                  
                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2 mt-4">
                    {training.discord_link && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(training.discord_link, "_blank")}
                        className="w-full flex items-center justify-center gap-2 border-primary/50 hover:bg-primary/10"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Entrar no Discord
                      </Button>
                    )}

                    {training.is_live && training.live_link && (
                      <Button
                        onClick={() => window.open(training.live_link, "_blank")}
                        className="w-full flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90"
                      >
                        <Video className="w-4 h-4" />
                        🔴 Assistir à Live
                      </Button>
                    )}
                  </div>

                  <Separator className="my-6" />
                </>
              ) : null}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={
                      training.status === "INSCRIÇÕES ABERTAS" 
                        ? "default" 
                        : training.status === "EM ANDAMENTO" 
                        ? "secondary" 
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {training.status || "INSCRIÇÕES ABERTAS"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Transmissão:</span>
                  <Badge
                    variant={training.is_live ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {training.is_live ? "AO VIVO" : "Offline"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">
                    Vagas Restantes:
                  </span>
                  <span className="font-semibold">
                    {training.max_slots - registeredTeams.length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Registration Confirmation Dialog */}
      <RegistrationConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleRegisterConfirm}
        training={training}
        teamName={myTeam?.name || ""}
        loading={actionLoading}
      />
    </div>
  );
};

export default TrainingDetails;
