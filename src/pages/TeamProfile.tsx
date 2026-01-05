import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trophy, Gamepad2, Medal, Award, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TeamProfile = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMatches: 0,
    wins: 0,
    winrate: 0,
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teamId) {
      fetchTeam();
    }
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch members
      const { data: membersData } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true });

      setMembers(membersData || []);

      // Fetch participation history
      const { data: registrations } = await supabase
        .from("training_registrations")
        .select(`
          *,
          trainings (*)
        `)
        .eq("team_id", teamId)
        .order("registered_at", { ascending: false });

      setHistory(registrations || []);

      // Calculate stats
      const totalMatches = registrations?.length || 0;
      // For now, wins and winrate are placeholders
      setStats({
        totalMatches,
        wins: 0,
        winrate: 0,
      });

    } catch (error) {
      toast.error("Equipe não encontrada");
      navigate("/equipes");
    } finally {
      setLoading(false);
    }
  };

  const getFunctionColor = (func: string) => {
    switch (func) {
      case "CAPITÃO":
        return "bg-primary/20 text-primary";
      case "SUPORTE":
        return "bg-blue-500/20 text-blue-400";
      case "RUSH":
        return "bg-destructive/20 text-destructive";
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

  return (
    <MainLayout>
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 via-destructive/10 to-primary/20">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        {/* Team Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-8">
          {/* Logo */}
          <div className="w-32 h-32 rounded-lg border-4 border-primary/50 bg-card overflow-hidden flex items-center justify-center">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt={team.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-16 h-16 text-primary" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black uppercase">{team.name}</h1>
              <Badge variant="outline" className="uppercase">
                [{team.tag}]
              </Badge>
              {!team.is_external && (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {members.length} membro{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-card/50 border-border text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalMatches}</p>
            <p className="text-sm text-muted-foreground">Partidas</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border text-center">
            <p className="text-2xl font-bold text-primary">{stats.wins}</p>
            <p className="text-sm text-muted-foreground">Vitórias</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border text-center">
            <p className="text-2xl font-bold text-primary">{stats.winrate}%</p>
            <p className="text-sm text-muted-foreground">Winrate</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="roster" className="mb-12">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
            <TabsTrigger value="roster" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roster">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <Card key={member.id} className="p-4 bg-card/50 border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{member.player_name}</h3>
                      <p className="text-sm text-muted-foreground">{member.game_id}</p>
                    </div>
                    <Badge className={getFunctionColor(member.function)}>
                      {member.function}
                    </Badge>
                  </div>
                </Card>
              ))}

              {members.length === 0 && (
                <Card className="p-8 bg-card/50 border-border text-center col-span-full">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Sem membros</h3>
                  <p className="text-muted-foreground">
                    Esta equipe ainda não possui membros cadastrados.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {history.map((item) => (
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

              {history.length === 0 && (
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

          <TabsContent value="badges">
            <Card className="p-8 bg-card/50 border-border text-center">
              <Medal className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Badges</h3>
              <p className="text-muted-foreground">
                Sistema de badges em desenvolvimento.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TeamProfile;
