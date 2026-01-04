import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Award,
} from "lucide-react";
import { RegisteredTeamsDialog } from "@/components/RegisteredTeamsDialog";
import { EventLogsDialog } from "@/components/EventLogsDialog";
import { BlacklistDialog } from "@/components/BlacklistDialog";
import { ScoringConfigDialog } from "@/components/ScoringConfigDialog";
import { UseTemplateDialog } from "@/components/UseTemplateDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, loading: roleLoading } = useUserRole(user?.id);
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
    game: "free_fire" as "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "battlefield_6",
    rules: "",
    discord_link: "",
    live_link: "",
    max_slots: 20,
    is_live: false,
    status: "INSCRIÇÕES ABERTAS" as "INSCRIÇÕES ABERTAS" | "INSCRIÇÕES ENCERRADAS" | "EM ANDAMENTO" | "FINALIZADO",
    table_image_url: "",
    important_info: "",
    prize: "",
    is_private: false,
    invited_tags: [] as string[],
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [tableFile, setTableFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showScoringComingSoon, setShowScoringComingSoon] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    console.log('[OrganizerDashboard] user:', user?.id, 'role:', role, 'roleLoading:', roleLoading);
    
    // Aguardar o carregamento do role antes de fazer qualquer verificação
    if (roleLoading) {
      console.log('[OrganizerDashboard] Still loading role...');
      return;
    }
    
    if (user) {
      // Se o role foi carregado e não é organizer, bloquear acesso
      if (role && role !== "organizer") {
        console.log('[OrganizerDashboard] Access denied - role:', role);
        toast.error("Acesso negado. Apenas organizadores podem acessar esta página.");
        navigate("/");
        return;
      }
      
      // Se o role é organizer, permitir acesso
      if (role === "organizer") {
        console.log('[OrganizerDashboard] Access granted, fetching trainings');
        fetchTrainings();
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

  const uploadFile = async (file: File, bucket: string, path: string) => {
    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("O arquivo deve ter no máximo 5MB");
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return publicUrl;
  };

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUploading(true);
      
      let bannerUrl = trainingForm.banner_url;
      let tableImageUrl = trainingForm.table_image_url;

      // Upload banner if file selected
      if (bannerFile) {
        const fileName = `${user.id}/${Date.now()}_${bannerFile.name}`;
        bannerUrl = await uploadFile(bannerFile, 'training-banners', fileName);
      }

      // Upload table image if file selected
      if (tableFile) {
        const fileName = `${user.id}/${Date.now()}_${tableFile.name}`;
        tableImageUrl = await uploadFile(tableFile, 'training-tables', fileName);
      }

      const trainingData: any = {
        name: trainingForm.name,
        banner_url: bannerUrl || null,
        datetime: trainingForm.datetime,
        rounds: trainingForm.rounds,
        points_per_kill: trainingForm.points_per_kill,
        points_per_position: JSON.parse(trainingForm.points_per_position || "[]"),
        points_per_position_text: trainingForm.points_per_position_text || null,
        platform: trainingForm.platform,
        mode: trainingForm.mode,
        game: trainingForm.game,
        rules: trainingForm.rules || null,
        discord_link: trainingForm.discord_link || null,
        live_link: trainingForm.live_link || null,
        max_slots: trainingForm.max_slots,
        is_live: trainingForm.is_live,
        status: trainingForm.status,
        table_image_url: tableImageUrl || null,
        important_info: trainingForm.important_info || null,
        prize: trainingForm.prize || null,
        is_private: trainingForm.is_private,
        invited_tags: trainingForm.invited_tags,
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
    } finally {
      setUploading(false);
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
      game: training.game as "free_fire" | "blood_strike" | "farlight_84",
      rules: training.rules || "",
      discord_link: training.discord_link || "",
      live_link: training.live_link || "",
      max_slots: training.max_slots,
      is_live: training.is_live,
      status: training.status || "ABERTO",
      table_image_url: training.table_image_url || "",
      important_info: training.important_info || "",
      prize: training.prize || "",
      is_private: training.is_private || false,
      invited_tags: training.invited_tags || [],
    });
    setBannerFile(null);
    setTableFile(null);
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
      game: "free_fire" as "free_fire" | "blood_strike" | "farlight_84",
      rules: "",
      discord_link: "",
      live_link: "",
      max_slots: 20,
      is_live: false,
      status: "INSCRIÇÕES ABERTAS" as "INSCRIÇÕES ABERTAS" | "INSCRIÇÕES ENCERRADAS" | "EM ANDAMENTO" | "FINALIZADO",
      table_image_url: "",
      important_info: "",
      prize: "",
      is_private: false,
      invited_tags: [],
    });
    setBannerFile(null);
    setTableFile(null);
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
      <Header user={user} />

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

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate("/external-teams")}
            >
              <Users className="w-4 h-4 mr-2" />
              Equipes Externas
            </Button>
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
                <Button className="bg-gradient-primary">
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
              
              {/* Use Template Button */}
              {!editingTraining && user && (
                <UseTemplateDialog
                  organizerId={user.id}
                  onSelectTemplate={(template) => {
                    setTrainingForm({
                      ...trainingForm,
                      game: template.game as "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "battlefield_6",
                      mode: template.mode as "Solo" | "Duo" | "Squad",
                      platform: template.platform as "PC" | "Mobile" | "Misto",
                      max_slots: template.max_slots,
                      rounds: template.rounds,
                      points_per_kill: template.points_per_kill,
                      points_per_position: JSON.stringify(template.points_per_position || []),
                      points_per_position_text: template.points_per_position_text || "",
                      rules: template.rules || "",
                      prize: template.prize || "",
                      important_info: template.important_info || "",
                      discord_link: template.discord_link || "",
                    });
                  }}
                />
              )}
              
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
                  <Label htmlFor="game">Jogo</Label>
                  <Select
                    value={trainingForm.game}
                    onValueChange={(value: "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "battlefield_6") =>
                      setTrainingForm({ ...trainingForm, game: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_fire">Free Fire</SelectItem>
                      <SelectItem value="blood_strike">Blood Strike</SelectItem>
                      <SelectItem value="farlight_84">Farlight 84</SelectItem>
                      <SelectItem value="prime_rush">Prime Rush</SelectItem>
                      <SelectItem value="battlefield_6">Battlefield 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="banner">Banner do Treino</Label>
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  />
                  {trainingForm.banner_url && !bannerFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Banner atual carregado
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Recomendado: 1920x400px (4.8:1) | Máximo: 5MB
                  </p>
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
                      onValueChange={(value: "INSCRIÇÕES ABERTAS" | "INSCRIÇÕES ENCERRADAS" | "EM ANDAMENTO" | "FINALIZADO") =>
                        setTrainingForm({ ...trainingForm, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INSCRIÇÕES ABERTAS">INSCRIÇÕES ABERTAS</SelectItem>
                        <SelectItem value="INSCRIÇÕES ENCERRADAS">INSCRIÇÕES ENCERRADAS</SelectItem>
                        <SelectItem value="EM ANDAMENTO">EM ANDAMENTO</SelectItem>
                        <SelectItem value="FINALIZADO">FINALIZADO</SelectItem>
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
                  <Label htmlFor="prize">Premiação (opcional)</Label>
                  <Textarea
                    id="prize"
                    placeholder="Ex: 1º Lugar - R$ 500, 2º Lugar - R$ 300..."
                    value={trainingForm.prize}
                    onChange={(e) =>
                      setTrainingForm({
                        ...trainingForm,
                        prize: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="table_image">
                    Tabela de Resultados (opcional)
                  </Label>
                  <Input
                    id="table_image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setTableFile(e.target.files?.[0] || null)}
                  />
                  {trainingForm.table_image_url && !tableFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tabela atual carregada
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Máximo: 5MB
                  </p>
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

                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="is_private">Treino Privado (somente convidados)</Label>
                      <p className="text-xs text-muted-foreground">
                        Se ativado, apenas equipes convidadas poderão se inscrever
                      </p>
                    </div>
                    <Switch
                      id="is_private"
                      checked={trainingForm.is_private}
                      onCheckedChange={(checked) =>
                        setTrainingForm({ ...trainingForm, is_private: checked })
                      }
                    />
                  </div>

                  {trainingForm.is_private && (
                    <div>
                      <Label htmlFor="invited_tags">TAGs das Equipes Convidadas</Label>
                      <Input
                        id="invited_tags"
                        placeholder="Ex: ABC DEF GHI ou ABC, DEF, GHI"
                        value={trainingForm.invited_tags.join(", ")}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(/[\s,]+/)
                            .map(tag => tag.trim().toUpperCase())
                            .filter(tag => tag.length > 0);
                          setTrainingForm({
                            ...trainingForm,
                            invited_tags: tags,
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Separe as TAGs por vírgula ou espaço
                      </p>
                    </div>
                  )}
                </div>

                {trainingForm.table_image_url && (
                  <div className="flex items-center gap-2">
                    <Label>Tabela de Resultados Atual</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTrainingForm({ ...trainingForm, table_image_url: "" })
                      }
                    >
                      Remover Tabela
                    </Button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Fazendo upload...
                    </>
                  ) : (
                    editingTraining ? "Salvar Alterações" : "Criar Treino"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <BlacklistDialog />
        </div>
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
                  <h3 className="font-semibold text-lg line-clamp-1 uppercase">
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

                  <div className="flex flex-col gap-2 mb-2">
                    <div className="flex gap-2">
                      <RegisteredTeamsDialog 
                        trainingId={training.id}
                        trainingName={training.name}
                      />
                      <EventLogsDialog
                        trainingId={training.id}
                        trainingName={training.name}
                      />
                      <ScoringConfigDialog
                        trainingId={training.id}
                        currentPointsPerKill={training.points_per_kill}
                        currentPointsPerPosition={training.points_per_position || []}
                        onConfigUpdated={fetchTrainings}
                      />
                    </div>
                  </div>

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

      {/* Dialog para Pontuação em Desenvolvimento */}
      <AlertDialog open={showScoringComingSoon} onOpenChange={setShowScoringComingSoon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚙️ Funcionalidade em Desenvolvimento</AlertDialogTitle>
            <AlertDialogDescription>
              O sistema de pontuação está sendo desenvolvido e estará disponível em breve. 
              Em breve você poderá gerenciar as pontuações das equipes de forma automática!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizerDashboard;
