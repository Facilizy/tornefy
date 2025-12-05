import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Edit,
  Trash2,
  Loader2,
  Plus,
  ArrowLeft,
  UserPlus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface TeamMember {
  id: string;
  player_name: string;
  game_id: string;
  discord: string;
  function: string;
}

interface ExternalTeam {
  id: string;
  name: string;
  tag: string;
  created_at: string;
  members: TeamMember[];
  training?: {
    name: string;
    datetime: string;
  };
}

const ExternalTeams = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<ExternalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ExternalTeam | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [teamForm, setTeamForm] = useState({
    name: "",
    tag: "",
  });

  const [memberForm, setMemberForm] = useState({
    player_name: "",
    game_id: "",
    discord: "",
    function: "RUSH" as "RUSH" | "SUPORTE" | "CAPITÃO",
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (roleLoading) return;
    
    if (user) {
      if (role && role !== "organizer") {
        toast.error("Acesso negado. Apenas organizadores podem acessar esta página.");
        navigate("/");
        return;
      }
      
      if (role === "organizer") {
        fetchExternalTeams();
      }
    }
  }, [user, role, roleLoading]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    } else {
      navigate("/auth");
    }
  };

  const fetchExternalTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members (*),
          training_registrations (
            trainings (
              name,
              datetime
            )
          )
        `)
        .eq("owner_id", user.id)
        .eq("is_external", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const teamsWithTraining = data?.map((team) => ({
        ...team,
        members: team.team_members || [],
        training: team.training_registrations?.[0]?.trainings,
      }));

      setTeams(teamsWithTraining || []);
    } catch (error: any) {
      console.error("Error fetching external teams:", error);
      toast.error("Erro ao carregar equipes externas");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Deseja realmente excluir esta equipe externa?")) return;

    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;
      toast.success("Equipe externa excluída!");
      fetchExternalTeams();
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error("Erro ao excluir equipe");
    }
  };

  const openEditTeam = (team: ExternalTeam) => {
    setSelectedTeam(team);
    setTeamForm({ name: team.name, tag: team.tag || '' });
    setEditDialogOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeam) return;

    try {
      const { error } = await supabase
        .from("teams")
        .update({ name: teamForm.name, tag: teamForm.tag.toUpperCase() || 'CONVIDADO' })
        .eq("id", selectedTeam.id);

      if (error) throw error;
      toast.success("Equipe atualizada!");
      setEditDialogOpen(false);
      fetchExternalTeams();
    } catch (error: any) {
      toast.error("Erro ao atualizar equipe");
    }
  };

  const openAddMember = (team: ExternalTeam) => {
    setSelectedTeam(team);
    setEditingMember(null);
    setMemberForm({
      player_name: "",
      game_id: "",
      discord: "",
      function: "RUSH",
    });
    setMemberDialogOpen(true);
  };

  const openEditMember = (team: ExternalTeam, member: TeamMember) => {
    setSelectedTeam(team);
    setEditingMember(member);
    setMemberForm({
      player_name: member.player_name,
      game_id: member.game_id,
      discord: member.discord,
      function: member.function as "RUSH" | "SUPORTE" | "CAPITÃO",
    });
    setMemberDialogOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeam) return;

    try {
      if (editingMember) {
        const { error } = await supabase
          .from("team_members")
          .update(memberForm)
          .eq("id", editingMember.id);

        if (error) throw error;
        toast.success("Membro atualizado!");
      } else {
        const { error } = await supabase.from("team_members").insert({
          ...memberForm,
          team_id: selectedTeam.id,
        });

        if (error) throw error;
        toast.success("Membro adicionado!");
      }

      setMemberDialogOpen(false);
      fetchExternalTeams();
    } catch (error: any) {
      toast.error("Erro ao salvar membro");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Deseja realmente remover este membro?")) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Membro removido!");
      fetchExternalTeams();
    } catch (error: any) {
      toast.error("Erro ao remover membro");
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/organizer")}
            className="mb-4 hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Painel
          </Button>

          <h1 className="text-4xl font-bold gradient-text mb-2">
            Equipes Externas
          </h1>
          <p className="text-muted-foreground">
            Gerencie as equipes externas que você criou para seus treinos
          </p>
        </div>

        {/* Search Filter */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipe por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {teams.length === 0 ? (
          <Card className="p-12 text-center backdrop-blur-sm bg-card/80 border-border">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Nenhuma equipe externa</h2>
            <p className="text-muted-foreground mb-6">
              Você ainda não criou equipes externas para seus treinos
            </p>
            <Button
              onClick={() => navigate("/organizer")}
              className="bg-gradient-primary"
            >
              Ir para Painel
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {teams
              .filter((team) =>
                team.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((team) => (
              <Card
                key={team.id}
                className="backdrop-blur-sm bg-card/80 border-border"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl uppercase">
                          {team.name}
                        </CardTitle>
                        <Badge variant="secondary" className="uppercase">
                          [{team.tag || 'CONVIDADO'}]
                        </Badge>
                      </div>
                      {team.training && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Treino: {team.training.name}
                        </p>
                      )}
                      <Badge variant="outline" className="mt-2 border-primary text-primary">
                        Convidado
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditTeam(team)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">
                      Membros ({team.members.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddMember(team)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {team.members.length > 0 ? (
                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {member.player_name}
                            </p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span>Função: {member.function}</span>
                              <span>ID: {member.game_id}</span>
                              <span>Discord: {member.discord}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditMember(team, member)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMember(member.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum membro cadastrado
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Team Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Editar Equipe Externa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamName">Nome da Equipe</Label>
                  <Input
                    id="teamName"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="teamTag">TAG (Fictícia)</Label>
                  <Input
                    id="teamTag"
                    value={teamForm.tag}
                    onChange={(e) => setTeamForm({ ...teamForm, tag: e.target.value.toUpperCase() })}
                    maxLength={10}
                    placeholder="Ex: GUEST"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Member Dialog */}
        <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Editar Membro" : "Adicionar Membro"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <Label htmlFor="playerName">Nome do Jogador</Label>
                <Input
                  id="playerName"
                  value={memberForm.player_name}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, player_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="gameId">ID do Jogo</Label>
                <Input
                  id="gameId"
                  value={memberForm.game_id}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, game_id: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="discord">Discord</Label>
                <Input
                  id="discord"
                  value={memberForm.discord}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, discord: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="function">Função</Label>
                <Select
                  value={memberForm.function}
                  onValueChange={(value) =>
                    setMemberForm({
                      ...memberForm,
                      function: value as "RUSH" | "SUPORTE" | "CAPITÃO",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUSH">RUSH</SelectItem>
                    <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                    <SelectItem value="CAPITÃO">CAPITÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMemberDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingMember ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ExternalTeams;
