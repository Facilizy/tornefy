import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Trophy, 
  Gamepad2, 
  Medal, 
  Award, 
  CheckCircle, 
  MapPin, 
  Monitor,
  Settings,
  ArrowLeft,
  Crown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  player_name: string;
  game_id: string;
  discord: string;
  function: string;
}

const TeamProfile = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    winrate: 0,
    kills: 0,
    bestPosition: "-",
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

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
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      const { data: membersData } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });

      setMembers(membersData || []);

      const { data: registrations } = await supabase
        .from("training_registrations")
        .select(`
          *,
          trainings (*)
        `)
        .eq("team_id", teamId)
        .order("registered_at", { ascending: false });

      setHistory(registrations || []);

      const totalMatches = registrations?.length || 0;
      setStats({
        totalMatches,
        wins: 0,
        winrate: 0,
        kills: 0,
        bestPosition: "-",
      });

    } catch (error) {
      toast.error("Equipe não encontrada");
      navigate("/equipes");
    } finally {
      setLoading(false);
    }
  };

  const getFunctionBadge = (func: string) => {
    switch (func) {
      case "CAPITÃO":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "SUPORTE":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "RUSH":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
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

  const primaryColor = team.primary_color || "#DC2626";
  const secondaryColor = team.secondary_color || "#1F2937";

  return (
    <MainLayout>
      {/* Banner */}
      <div 
        className="relative h-48 md:h-64"
        style={{
          background: team.banner_url 
            ? `url(${team.banner_url}) center/cover` 
            : `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-10">
        {/* Team Header */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Left: Logo & Info */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Logo */}
              <div 
                className="w-28 h-28 rounded-2xl border-4 bg-card overflow-hidden flex items-center justify-center shadow-xl"
                style={{ borderColor: primaryColor }}
              >
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black" style={{ color: primaryColor }}>
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
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
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
                  <p className="text-muted-foreground">{team.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Stats Card */}
          <Card 
            className="w-full lg:w-72 p-4 border-2"
            style={{ borderColor: `${primaryColor}30`, background: `${primaryColor}10` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-10 h-10" style={{ color: primaryColor }} />
              <div>
                <p className="text-xs text-muted-foreground">T-Rating</p>
                <p className="text-3xl font-black">{team.rating || 1000}</p>
                <p className="text-xs text-muted-foreground">
                  {team.rating >= 1500 ? "Ouro" : team.rating >= 1200 ? "Prata" : "Bronze"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Scrims</p>
                <p className="text-lg font-bold" style={{ color: primaryColor }}>{stats.totalMatches}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kills</p>
                <p className="text-lg font-bold" style={{ color: primaryColor }}>{stats.kills}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best</p>
                <p className="text-lg font-bold" style={{ color: primaryColor }}>{stats.bestPosition}</p>
              </div>
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
            <div className="mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-bold uppercase">EQUIPES</h2>
              <span className="text-sm text-muted-foreground">{members.length} line ativa</span>
            </div>
            
            <Card className="p-4 bg-card/50 border-primary/20" style={{ borderColor: `${primaryColor}30` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">MAIN</span>
                      <Badge className="bg-primary text-primary-foreground text-xs">Padrão</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {members.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {members.map((member, index) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        {member.player_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{member.player_name}</span>
                          {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.game_id}</p>
                      </div>
                    </div>
                    <Badge className={getFunctionBadge(member.function)}>
                      {member.function === "CAPITÃO" ? "Flex" : member.function}
                    </Badge>
                  </div>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum membro cadastrado</p>
                  </div>
                )}
              </div>
            </Card>
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

              {(team.discord_url || team.twitter_url || team.instagram_url) && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Redes Sociais</h4>
                  <div className="flex gap-3">
                    {team.discord_url && (
                      <a href={team.discord_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Discord
                      </a>
                    )}
                    {team.twitter_url && (
                      <a href={team.twitter_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Twitter
                      </a>
                    )}
                    {team.instagram_url && (
                      <a href={team.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}
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
    </MainLayout>
  );
};

export default TeamProfile;
