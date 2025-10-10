import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Upload,
  Calendar,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MyTeam = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [upcomingTrainings, setUpcomingTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const [teamForm, setTeamForm] = useState({
    name: "",
    tag: "",
    logo_url: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pastTrainings, setPastTrainings] = useState<any[]>([]);

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
    if (user) {
      fetchTeam();
    }
  }, [user]);

  useEffect(() => {
    if (team) {
      fetchMembers();
      fetchUpcomingTrainings();
      fetchPastTrainings();
    }
  }, [team]);

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

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setTeam(data);
        setTeamForm({
          name: data.name,
          tag: data.tag,
          logo_url: data.logo_url || "",
        });
      }
    } catch (error: any) {
      toast.error("Erro ao carregar equipe");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: true });

    setMembers(data || []);
  };

  const fetchUpcomingTrainings = async () => {
    const { data } = await supabase
      .from("training_registrations")
      .select(
        `
        *,
        trainings (*)
      `
      )
      .eq("team_id", team.id);

    const upcoming = data
      ?.filter(
        (reg: any) => new Date(reg.trainings.datetime) > new Date()
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.trainings.datetime).getTime() -
          new Date(b.trainings.datetime).getTime()
      );

    setUpcomingTrainings(upcoming || []);
  };

  const fetchPastTrainings = async () => {
    const { data } = await supabase
      .from("training_registrations")
      .select(
        `
        *,
        trainings (*)
      `
      )
      .eq("team_id", team.id);

    const past = data
      ?.filter(
        (reg: any) => new Date(reg.trainings.datetime) <= new Date()
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.trainings.datetime).getTime() -
          new Date(a.trainings.datetime).getTime()
      );

    setPastTrainings(past || []);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUploading(true);

      // Validar tamanho do arquivo (máximo 5MB)
      if (logoFile && logoFile.size > 5 * 1024 * 1024) {
        toast.error("A logo deve ter no máximo 5MB");
        return;
      }

      let logoUrl = teamForm.logo_url;

      // Upload logo if file selected
      if (logoFile) {
        const fileName = `${user.id}/${Date.now()}_${logoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('team-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('team-logos')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      const teamData = {
        ...teamForm,
        logo_url: logoUrl || null,
      };

      if (team) {
        const { error } = await supabase
          .from("teams")
          .update(teamData)
          .eq("id", team.id);

        if (error) throw error;
        toast.success("Equipe atualizada!");
      } else {
        const { data, error } = await supabase
          .from("teams")
          .insert({
            ...teamData,
            owner_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        setTeam(data);
        toast.success("Equipe criada!");
      }

      setDialogOpen(false);
      setLogoFile(null);
      fetchTeam();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar equipe");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

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
          team_id: team.id,
        });

        if (error) throw error;
        toast.success("Membro adicionado!");
      }

      setMemberDialogOpen(false);
      setEditingMember(null);
      setMemberForm({
        player_name: "",
        game_id: "",
        discord: "",
        function: "RUSH",
      });
      fetchMembers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar membro");
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
      fetchMembers();
    } catch (error: any) {
      toast.error("Erro ao remover membro");
    }
  };

  const openEditMember = (member: any) => {
    setEditingMember(member);
    setMemberForm({
      player_name: member.player_name,
      game_id: member.game_id,
      discord: member.discord,
      function: member.function,
    });
    setMemberDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Minha Equipe
          </h1>
          <p className="text-muted-foreground">
            Gerencie sua equipe e veja seus próximos treinos
          </p>
        </div>

        {!team ? (
          <Card className="p-12 text-center backdrop-blur-sm bg-card/80 border-border">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Você ainda não tem uma equipe</h2>
            <p className="text-muted-foreground mb-6">
              Crie sua equipe para participar dos treinos
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:shadow-glow-strong">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Equipe
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Criar Equipe</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveTeam} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Equipe</Label>
                    <Input
                      id="name"
                      value={teamForm.name}
                      onChange={(e) =>
                        setTeamForm({ ...teamForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tag">Tag</Label>
                    <Input
                      id="tag"
                      value={teamForm.tag}
                      onChange={(e) =>
                        setTeamForm({ ...teamForm, tag: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="logo">Logo da Equipe</Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                    {teamForm.logo_url && !logoFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Logo atual carregada
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Tamanho máximo: 5MB
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary"
                    disabled={uploading}
                  >
                    {uploading ? "Fazendo upload..." : "Criar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Team Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {team.logo_url && (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <h2 className="text-3xl font-bold">{team.name}</h2>
                      <p className="text-muted-foreground">[{team.tag}]</p>
                    </div>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Editar Equipe</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveTeam} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nome da Equipe</Label>
                          <Input
                            id="name"
                            value={teamForm.name}
                            onChange={(e) =>
                              setTeamForm({ ...teamForm, name: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="tag">Tag</Label>
                          <Input
                            id="tag"
                            value={teamForm.tag}
                            onChange={(e) =>
                              setTeamForm({ ...teamForm, tag: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="logo">Logo da Equipe</Label>
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                          />
                          {teamForm.logo_url && !logoFile && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Logo atual carregada
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Tamanho máximo: 5MB
                          </p>
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-gradient-primary"
                          disabled={uploading}
                        >
                          {uploading ? "Fazendo upload..." : "Salvar"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <Separator className="my-6" />

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Membros da Equipe</h3>
                  <Dialog
                    open={memberDialogOpen}
                    onOpenChange={(open) => {
                      setMemberDialogOpen(open);
                      if (!open) {
                        setEditingMember(null);
                        setMemberForm({
                          player_name: "",
                          game_id: "",
                          discord: "",
                          function: "RUSH",
                        });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-primary/20 hover:bg-primary/30">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Membro
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>
                          {editingMember ? "Editar Membro" : "Adicionar Membro"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveMember} className="space-y-4">
                        <div>
                          <Label htmlFor="player_name">Nome</Label>
                          <Input
                            id="player_name"
                            value={memberForm.player_name}
                            onChange={(e) =>
                              setMemberForm({
                                ...memberForm,
                                player_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="game_id">ID do Jogo</Label>
                          <Input
                            id="game_id"
                            value={memberForm.game_id}
                            onChange={(e) =>
                              setMemberForm({
                                ...memberForm,
                                game_id: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="discord">Discord</Label>
                          <Input
                            id="discord"
                            placeholder="@usuario"
                            value={memberForm.discord}
                            onChange={(e) =>
                              setMemberForm({
                                ...memberForm,
                                discord: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="function">Função</Label>
                          <Select
                            value={memberForm.function}
                            onValueChange={(value: any) =>
                              setMemberForm({ ...memberForm, function: value })
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
                        <Button
                          type="submit"
                          className="w-full bg-gradient-primary"
                        >
                          {editingMember ? "Salvar" : "Adicionar"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {members.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum membro adicionado ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <Card
                        key={member.id}
                        className="p-4 bg-background/50 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline">{member.function}</Badge>
                            <span className="font-semibold">
                              {member.player_name}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span>ID: {member.game_id}</span>
                            <span className="mx-2">•</span>
                            <span>{member.discord}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditMember(member)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteMember(member.id)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Upcoming Trainings */}
            <div>
              <Card className="p-6 backdrop-blur-sm bg-card/80 border-border sticky top-24">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Próximos X-Treinos
                </h3>

                {upcomingTrainings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    Nenhum treino agendado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingTrainings.map((registration: any) => (
                      <Card
                        key={registration.id}
                        className="p-4 bg-background/50 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() =>
                          navigate(`/training/${registration.trainings.id}`)
                        }
                      >
                        <div className="flex items-start gap-3">
                          <Trophy className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-1">
                              {registration.trainings.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(
                                new Date(registration.trainings.datetime),
                                "dd/MM 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge
                                variant="secondary"
                                className="text-xs"
                              >
                                {registration.trainings.platform}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {registration.trainings.mode}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <Separator className="my-4" />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Ver Todos os Treinos
                </Button>
              </Card>

              {/* Histórico de Torneios */}
              {pastTrainings.length > 0 && (
                <Card className="p-6 backdrop-blur-sm bg-card/80 border-border mt-4">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Histórico de X-Treinos
                  </h3>

                  <div className="space-y-3">
                    {pastTrainings.map((registration: any) => (
                      <Card
                        key={registration.id}
                        className="p-4 bg-background/50 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() =>
                          navigate(`/training/${registration.trainings.id}`)
                        }
                      >
                        <div className="flex items-start gap-3">
                          <Trophy className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-1">
                              {registration.trainings.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(
                                new Date(registration.trainings.datetime),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge
                                variant="secondary"
                                className="text-xs"
                              >
                                {registration.trainings.platform}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {registration.trainings.mode}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyTeam;
