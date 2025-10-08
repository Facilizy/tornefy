import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
            *,
            team_members (*)
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

  const handleRegister = async () => {
    if (!myTeam) {
      toast.error("Você precisa criar uma equipe primeiro!");
      navigate("/my-team");
      return;
    }

    if (registeredTeams.length >= training.max_slots) {
      toast.error("Este treino já está lotado!");
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase.from("training_registrations").insert({
        training_id: id,
        team_id: myTeam.id,
      });

      if (error) throw error;
      toast.success("Equipe inscrita com sucesso!");
      fetchTrainingDetails();
    } catch (error: any) {
      toast.error(error.message || "Erro ao inscrever equipe");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
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
      toast.error("Erro ao cancelar inscrição");
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
        <Header user={user} profile={profile} />
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
      <Header user={user} profile={profile} />

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
        <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8 animate-fade-in">
          {training.banner_url ? (
            <img
              src={training.banner_url}
              alt={training.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <Trophy className="w-32 h-32 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute bottom-6 left-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
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

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data e Hora</p>
                    <p className="font-semibold">
                      {format(
                        new Date(training.datetime),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vagas</p>
                    <p className="font-semibold">
                      {registeredTeams.length}/{training.max_slots}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getPlatformIcon(training.platform)}
                  <div>
                    <p className="text-sm text-muted-foreground">Plataforma</p>
                    <Badge variant="secondary">{training.platform}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Modo</p>
                    <Badge variant="outline">{training.mode}</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Quedas</p>
                    <p className="font-semibold">{training.rounds}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Pontuação
                </h3>
                <p className="text-sm text-muted-foreground">
                  Abates: {training.points_per_kill} ponto(s)
                </p>
                {training.points_per_position &&
                  Array.isArray(training.points_per_position) &&
                  training.points_per_position.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Por colocação: Configurado
                    </p>
                  )}
              </div>

              {training.rules && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-semibold mb-3">Regras do Treino</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {training.rules}
                    </p>
                  </div>
                </>
              )}

              <Separator className="my-6" />

              <div className="flex flex-wrap gap-3">
                {training.discord_link && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(training.discord_link, "_blank")}
                    className="flex items-center gap-2 border-primary/50 hover:bg-primary/10"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Discord
                  </Button>
                )}

                {training.is_live && training.live_link && (
                  <Button
                    onClick={() => window.open(training.live_link, "_blank")}
                    className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 animate-glow-pulse"
                  >
                    <Video className="w-4 h-4" />
                    Assistir à Live
                  </Button>
                )}
              </div>
            </Card>

            {/* Registered Teams */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
              <h2 className="text-2xl font-bold mb-4 gradient-text">
                Equipes Confirmadas ({registeredTeams.length})
              </h2>

              {registeredTeams.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma equipe inscrita ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {registeredTeams.map((registration: any) => (
                    <Card
                      key={registration.id}
                      className="p-4 bg-background/50"
                    >
                      <div className="flex items-start gap-4">
                        {registration.teams.logo_url && (
                          <img
                            src={registration.teams.logo_url}
                            alt={registration.teams.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {registration.teams.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            [{registration.teams.tag}]
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {registration.teams.team_members?.map(
                              (member: any) => (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {member.function}
                                  </Badge>
                                  <span>{member.player_name}</span>
                                  <span className="text-muted-foreground">
                                    ({member.game_id})
                                  </span>
                                </div>
                              )
                            )}
                          </div>
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
                      onClick={handleRegister}
                      disabled={
                        actionLoading ||
                        registeredTeams.length >= training.max_slots
                      }
                      className="w-full bg-gradient-primary hover:shadow-glow-strong"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {registeredTeams.length >= training.max_slots
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

              <Separator className="my-6" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={training.is_live ? "destructive" : "secondary"}
                  >
                    {training.is_live ? "AO VIVO" : "Aguardando"}
                  </Badge>
                </div>
                <div className="flex justify-between">
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
    </div>
  );
};

export default TrainingDetails;
