import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  Users,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);

  const [trainingForm, setTrainingForm] = useState({
    name: "",
    banner_url: "",
    datetime: "",
    rounds: 1,
    points_per_kill: 1,
    points_per_position: "[]",
    points_per_position_text: "",
    platform: "PC" as "PC" | "Mobile" | "Misto",
    mode: "Squad" as "Solo" | "Duo" | "Squad",
    rules: "",
    discord_link: "",
    live_link: "",
    max_slots: 20,
    is_live: false,
    status: "ABERTO" as "ABERTO" | "FECHADO",
    table_image_url: "",
    important_info: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && profile) {
      if (profile.role !== "organizer") {
        toast.error("Acesso negado. Apenas organizadores podem acessar esta página.");
        navigate("/");
        return;
      }
      fetchTrainings();
    }
  }, [user, profile]);

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

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("trainings")
        .select(
          `
          *,
          training_registrations(count)
        `
        )
        .eq("organizer_id", user.id)
        .order("datetime", { ascending: false });

      if (error) throw error;

      const trainingsWithCount = data?.map((training) => ({
        ...training,
        registrations: training.training_registrations?.[0]?.count || 0,
      }));

      setTrainings(trainingsWithCount || []);
    } catch (error: any) {
      toast.error("Erro ao carregar treinos");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const trainingData: any = {
        name: trainingForm.name,
        banner_url: trainingForm.banner_url || null,
        datetime: trainingForm.datetime,
        rounds: trainingForm.rounds,
        points_per_kill: trainingForm.points_per_kill,
        points_per_position: JSON.parse(trainingForm.points_per_position || "[]"),
        points_per_position_text: trainingForm.points_per_position_text || null,
        platform: trainingForm.platform,
        mode: trainingForm.mode,
        rules: trainingForm.rules || null,
        discord_link: trainingForm.discord_link || null,
        live_link: trainingForm.live_link || null,
        max_slots: trainingForm.max_slots,
        is_live: trainingForm.is_live,
        status: trainingForm.status,
        table_image_url: trainingForm.table_image_url || null,
        important_info: trainingForm.important_info || null,
        organizer_id: user.id,
      };

      if (editingTraining) {
        const { error } = await supabase
          .from("trainings")
          .update(trainingData)
          .eq("id", editingTraining.id);

        if (error) throw error;
        toast.success("Treino atualizado!");
      } else {
        const { error } = await supabase.from("trainings").insert(trainingData);

        if (error) throw error;
        toast.success("Treino criado!");
      }

      setDialogOpen(false);
      setEditingTraining(null);
      resetForm();
      fetchTrainings();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar treino");
    }
  };

  const handleDeleteTraining = async (trainingId: string) => {
    if (!confirm("Deseja realmente excluir este treino?")) return;

    try {
      const { error } = await supabase
        .from("trainings")
        .delete()
        .eq("id", trainingId);

      if (error) throw error;
      toast.success("Treino excluído!");
      fetchTrainings();
    } catch (error: any) {
      toast.error("Erro ao excluir treino");
    }
  };

  const openEditDialog = (training: any) => {
    setEditingTraining(training);
    
    // Converter datetime do formato ISO para datetime-local
    let formattedDatetime = "";
    if (training.datetime) {
      const date = new Date(training.datetime);
      // Formato: YYYY-MM-DDTHH:mm
      formattedDatetime = date.toISOString().slice(0, 16);
    }

    setTrainingForm({
      name: training.name,
      banner_url: training.banner_url || "",
      datetime: formattedDatetime,
      rounds: training.rounds,
      points_per_kill: training.points_per_kill,
      points_per_position: JSON.stringify(training.points_per_position || []),
      points_per_position_text: training.points_per_position_text || "",
      platform: training.platform as "PC" | "Mobile" | "Misto",
      mode: training.mode as "Solo" | "Duo" | "Squad",
      rules: training.rules || "",
      discord_link: training.discord_link || "",
      live_link: training.live_link || "",
      max_slots: training.max_slots,
      is_live: training.is_live,
      status: training.status || "ABERTO",
      table_image_url: training.table_image_url || "",
      important_info: training.important_info || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setTrainingForm({
      name: "",
      banner_url: "",
      datetime: "",
      rounds: 1,
      points_per_kill: 1,
      points_per_position: "[]",
      points_per_position_text: "",
      platform: "PC" as "PC" | "Mobile" | "Misto",
      mode: "Squad" as "Solo" | "Duo" | "Squad",
      rules: "",
      discord_link: "",
      live_link: "",
      max_slots: 20,
      is_live: false,
      status: "ABERTO" as "ABERTO" | "FECHADO",
      table_image_url: "",
      important_info: "",
    });
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
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Painel do Organizador
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus treinos e inscrições
            </p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingTraining(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-glow-strong">
                <Plus className="w-4 h-4 mr-2" />
                Criar Treino
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTraining ? "Editar Treino" : "Criar Treino"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveTraining} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Treino</Label>
                  <Input
                    id="name"
                    value={trainingForm.name}
                    onChange={(e) =>
                      setTrainingForm({ ...trainingForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="banner_url">URL do Banner</Label>
                  <Input
                    id="banner_url"
                    type="url"
                    placeholder="https://..."
                    value={trainingForm.banner_url}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        banner_url: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="datetime">Data e Hora</Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      value={trainingForm.datetime}
                      onChange={(e) =>
                        setTrainingForm({
                          ...trainingForm,
                          datetime: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_slots">Limite de Vagas</Label>
                    <Input
                      id="max_slots"
                      type="number"
                      min="1"
                      value={trainingForm.max_slots}
                      onChange={(e) =>
                        setTrainingForm({
                          ...trainingForm,
                          max_slots: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platform">Plataforma</Label>
                    <Select
                      value={trainingForm.platform}
                      onValueChange={(value: "PC" | "Mobile" | "Misto") =>
                        setTrainingForm({ ...trainingForm, platform: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PC">PC</SelectItem>
                        <SelectItem value="Mobile">Mobile</SelectItem>
                        <SelectItem value="Misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="mode">Modo</Label>
                    <Select
                      value={trainingForm.mode}
                      onValueChange={(value: "Solo" | "Duo" | "Squad") =>
                        setTrainingForm({ ...trainingForm, mode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Solo">Solo</SelectItem>
                        <SelectItem value="Duo">Duo</SelectItem>
                        <SelectItem value="Squad">Squad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status do Treino</Label>
                    <Select
                      value={trainingForm.status}
                      onValueChange={(value: "ABERTO" | "FECHADO") =>
                        setTrainingForm({ ...trainingForm, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABERTO">ABERTO</SelectItem>
                        <SelectItem value="FECHADO">FECHADO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="rounds">Quantidade de Quedas</Label>
                    <Input
                      id="rounds"
                      type="number"
                      min="1"
                      value={trainingForm.rounds}
                      onChange={(e) =>
                        setTrainingForm({
                          ...trainingForm,
                          rounds: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="points_per_kill">Pontos por Abate</Label>
                  <Input
                    id="points_per_kill"
                    type="number"
                    min="0"
                    value={trainingForm.points_per_kill}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        points_per_kill: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="points_per_position_text">
                    Pontos por Colocação (texto livre)
                  </Label>
                  <Textarea
                    id="points_per_position_text"
                    rows={4}
                    placeholder="Ex: 1º Lugar - 10 pontos&#10;2º Lugar - 8 pontos&#10;3º Lugar - 6 pontos..."
                    value={trainingForm.points_per_position_text}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        points_per_position_text: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="rules">Regras do Treino</Label>
                  <Textarea
                    id="rules"
                    rows={4}
                    placeholder="Descreva as regras do treino..."
                    value={trainingForm.rules}
                    onChange={(e) =>
                      setTrainingForm({ ...trainingForm, rules: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="important_info">
                    Informações Importantes
                  </Label>
                  <Textarea
                    id="important_info"
                    rows={4}
                    placeholder="Adicione informações importantes sobre o treino..."
                    value={trainingForm.important_info}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        important_info: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="table_image_url">
                    URL da Imagem da Tabela (opcional)
                  </Label>
                  <Input
                    id="table_image_url"
                    type="url"
                    placeholder="https://..."
                    value={trainingForm.table_image_url}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        table_image_url: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="discord_link">Link do Discord</Label>
                  <Input
                    id="discord_link"
                    type="url"
                    placeholder="https://discord.gg/..."
                    value={trainingForm.discord_link}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        discord_link: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="live_link">Link da Live (opcional)</Label>
                  <Input
                    id="live_link"
                    type="url"
                    placeholder="https://..."
                    value={trainingForm.live_link}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        live_link: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_live">Treino está ao vivo?</Label>
                  <Switch
                    id="is_live"
                    checked={trainingForm.is_live}
                    onCheckedChange={(checked) =>
                      setTrainingForm({ ...trainingForm, is_live: checked })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                >
                  {editingTraining ? "Salvar Alterações" : "Criar Treino"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {trainings.length === 0 ? (
          <Card className="p-12 text-center backdrop-blur-sm bg-card/80 border-border">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">
              Você ainda não criou nenhum treino
            </h2>
            <p className="text-muted-foreground">
              Comece criando seu primeiro treino
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map((training) => (
              <Card
                key={training.id}
                className="overflow-hidden backdrop-blur-sm bg-card/80 border-border hover:border-primary/50 transition-all"
              >
                <div className="relative h-32 bg-gradient-primary">
                  {training.banner_url ? (
                    <img
                      src={training.banner_url}
                      alt={training.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  {training.is_live && (
                    <Badge className="absolute top-2 right-2 bg-destructive animate-glow-pulse">
                      AO VIVO
                    </Badge>
                  )}
                  <Badge
                    className="absolute top-2 left-2"
                    variant={training.status === "ABERTO" ? "default" : "destructive"}
                  >
                    {training.status || "ABERTO"}
                  </Badge>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {training.name}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(
                        new Date(training.datetime),
                        "dd/MM/yyyy 'às' HH:mm"
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-primary" />
                    <span>
                      <span className="font-semibold">
                        {training.registrations}
                      </span>
                      /{training.max_slots} equipes inscritas
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="secondary">{training.platform}</Badge>
                    <Badge variant="outline">{training.mode}</Badge>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/training/${training.id}`)}
                      className="flex-1"
                    >
                      Ver Detalhes
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(training)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTraining(training.id)}
                      className="hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrganizerDashboard;
