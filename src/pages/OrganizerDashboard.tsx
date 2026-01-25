import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Tv,
  ExternalLink,
} from "lucide-react";
import { RegisteredTeamsDialog } from "@/components/RegisteredTeamsDialog";
import { EventLogsDialog } from "@/components/EventLogsDialog";
import { BlacklistDialog } from "@/components/BlacklistDialog";
import { ScoringConfigDialog } from "@/components/ScoringConfigDialog";
import { UseTemplateDialog } from "@/components/UseTemplateDialog";
import { TrainingWizard } from "@/components/TrainingWizard";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";
import { DynamicBanner } from "@/components/DynamicBanner";
import TornefyBannerMark from "@/components/TornefyBannerMark";


const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all" as
      | "all"
      | "INSCRIÇÕES ABERTAS"
      | "INSCRIÇÕES ENCERRADAS"
      | "EM ANDAMENTO"
      | "FINALIZADO",
    platform: "all" as "all" | "PC" | "Mobile" | "Misto",
    game: "all" as
      | "all"
      | "free_fire"
      | "blood_strike"
      | "farlight_84"
      | "prime_rush"
      | "battlefield_6",
    dateFrom: "", // YYYY-MM-DD
    dateTo: "", // YYYY-MM-DD
  });
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const [isVerifiedByRole, setIsVerifiedByRole] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [organizerStats, setOrganizerStats] = useState({
    totalTrainings: 0,
    completedMatches: 0,
    uniquePlayersImpacted: 0,
    achievements: [] as {
      id: string;
      name: string;
      description: string | null;
      progress: number;
      targetValue: number;
      unlocked: boolean;
    }[],
  });

  const [trainingForm, setTrainingForm] = useState({
    name: "",
    banner_url: "",
    datetime: "",
    rounds: 3,
    points_per_kill: 1,
    points_per_position: "[]",
    platform: "PC" as "PC" | "Mobile" | "Misto",
    mode: "Squad" as "Solo" | "Duo" | "Squad",
    game: "free_fire" as "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "battlefield_6",
    discord_link: "",
    whatsapp_link: "",
    max_slots: 20,
    status: "INSCRIÇÕES ABERTAS" as
      | "INSCRIÇÕES ABERTAS"
      | "INSCRIÇÕES ENCERRADAS"
      | "EM ANDAMENTO"
      | "FINALIZADO",
    important_info: "",
    is_private: false,
    invited_tags: [] as string[],
    table_image_url: "",
    is_live: false,
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
      if (role && role !== "organizer" && role !== "admin") {
        console.log('[OrganizerDashboard] Access denied - role:', role);
        toast.error("Acesso negado. Apenas organizadores podem acessar esta página.");
        navigate("/");
        return;
      }
      
      // Se o role é organizer, permitir acesso
      if (role === "organizer" || role === "admin") {
        console.log('[OrganizerDashboard] Access granted, fetching trainings and stats');
        fetchTrainings();
        fetchOrganizerStats();
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

  const fetchOrganizerStats = async () => {
    if (!user) return;

    try {
      // Carregar treinos do organizador
      const [{ data: trainingsData, error: trainingsError }, verifiedRes] = await Promise.all([
        supabase.from("trainings").select("id").eq("organizer_id", user.id),
        // Público (funciona para player/deslogado também) e evita depender de SELECT em user_roles.
        (supabase as any).rpc("is_organizer_verified", { _user_id: String(user.id) }),
      ]);

      if (trainingsError) throw trainingsError;
      setIsVerifiedByRole(!!verifiedRes?.data);

      const trainingIds = (trainingsData || []).map((t: any) => t.id);

      let completedMatches = 0;
      let uniquePlayersImpacted = 0;

      if (trainingIds.length > 0) {
        // Quedas completadas nesses treinos
        const { data: matches, error: matchesError } = await supabase
          .from("training_matches")
          .select("id, status, training_id")
          .in("training_id", trainingIds);

        if (matchesError) throw matchesError;

        completedMatches = (matches || []).filter(
          (m: any) => m.status === "completed"
        ).length;

        // Jogadores impactados: todos os membros das equipes inscritas nesses treinos
        const { data: registrations, error: regError } = await supabase
          .from("training_registrations")
          .select("team_id")
          .in("training_id", trainingIds);

        if (regError) throw regError;

        const teamIds = Array.from(
          new Set((registrations || []).map((r: any) => r.team_id).filter(Boolean))
        );

        if (teamIds.length > 0) {
          const { data: members, error: membersError } = await supabase
            .from("team_members")
            .select("id")
            .in("team_id", teamIds);

          if (membersError) throw membersError;

          uniquePlayersImpacted = new Set((members || []).map((m: any) => m.id)).size;
        }
      }

      // Conquistas de organizador
      const { data: userAchievements, error: uaError } = await supabase
        .from("user_achievements")
        .select("id, achievement_id, progress, unlocked_at")
        .eq("user_id", user.id);

      if (uaError) throw uaError;

      let achievements: {
        id: string;
        name: string;
        description: string | null;
        progress: number;
        targetValue: number;
        unlocked: boolean;
      }[] = [];

      if (userAchievements && userAchievements.length > 0) {
        const achievementIds = userAchievements.map((ua: any) => ua.achievement_id);

        const { data: achievementsData, error: achError } = await supabase
          .from("achievements")
          .select("id, name, description, target_value, audience")
          .in("id", achievementIds);

        if (achError) throw achError;

        const achById = new Map((achievementsData || []).map((a: any) => [a.id, a]));

        achievements = userAchievements
          .map((ua: any) => {
            const ach = achById.get(ua.achievement_id);
            if (!ach || (ach.audience && ach.audience !== "organizer")) return null;

            const target = ach?.target_value ?? 1;
            const progress = ua.progress ?? 0;
            const unlocked = !!ua.unlocked_at;

            return {
              id: ua.id,
              name: ach?.name || "Conquista",
              description: ach?.description || null,
              progress,
              targetValue: target,
              unlocked,
            };
          })
          .filter(Boolean) as any[];
      }

      setOrganizerStats({
        totalTrainings: trainingsData?.length || 0,
        completedMatches,
        uniquePlayersImpacted,
        achievements,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas do organizador:", error);
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
        bannerUrl = await uploadFile(bannerFile, "training-banners", fileName);
      }

      // Upload table image if file selected
      if (tableFile) {
        const fileName = `${user.id}/${Date.now()}_${tableFile.name}`;
        tableImageUrl = await uploadFile(tableFile, "training-tables", fileName);
      }

      const trainingData: any = {
        name: trainingForm.name,
        banner_url: bannerUrl || null,
        // datetime-local ("YYYY-MM-DDTHH:mm") precisa virar ISO com timezone,
        // senão o banco interpreta como UTC e o horário aparece deslocado.
        datetime: trainingForm.datetime ? new Date(trainingForm.datetime).toISOString() : null,
        rounds: trainingForm.rounds,
        points_per_kill: trainingForm.points_per_kill,
        platform: trainingForm.platform,
        mode: trainingForm.mode,
        game: trainingForm.game,
        discord_link: trainingForm.discord_link || null,
        whatsapp_link: trainingForm.whatsapp_link || null,
        max_slots: trainingForm.max_slots,
        status: trainingForm.status,
        important_info: trainingForm.important_info || null,
        is_private: trainingForm.is_private,
        invited_tags: trainingForm.invited_tags,
        organizer_id: user.id,
        table_image_url: tableImageUrl || null,
      };

      if (editingTraining) {
        const { error } = await supabase
          .from("trainings")
          .update(trainingData)
          .eq("id", editingTraining.id);

        if (error) throw error;
        toast.success("Treino atualizado!");
      } else {
        const trainingId = crypto.randomUUID();
        const { error } = await supabase
          .from("trainings")
          .insert({ ...trainingData, id: trainingId });

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
    
    // Converter ISO (armazenado) para datetime-local (input)
    let formattedDatetime = "";
    if (training.datetime) {
      const date = new Date(training.datetime);
      // converter para "local" antes de cortar, senão fica deslocado
      formattedDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }

    setTrainingForm({
      name: training.name,
      banner_url: training.banner_url || "",
      datetime: formattedDatetime,
      rounds: training.rounds,
      points_per_kill: training.points_per_kill,
      points_per_position: JSON.stringify(training.points_per_position || []),
      platform: training.platform as "PC" | "Mobile" | "Misto",
      mode: training.mode as "Solo" | "Duo" | "Squad",
      game: training.game as
        | "free_fire"
        | "blood_strike"
        | "farlight_84"
        | "prime_rush"
        | "battlefield_6",
      discord_link: training.discord_link || "",
      whatsapp_link: training.whatsapp_link || "",
      max_slots: training.max_slots,
      status: training.status || "INSCRIÇÕES ABERTAS",
      important_info: training.important_info || "",
      is_private: training.is_private || false,
      invited_tags: training.invited_tags || [],
      table_image_url: training.table_image_url || "",
      is_live: training.is_live || false,
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
      rounds: 3,
      points_per_kill: 1,
      points_per_position: "[]",
      platform: "PC" as "PC" | "Mobile" | "Misto",
      mode: "Squad" as "Solo" | "Duo" | "Squad",
      game: "free_fire" as "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "battlefield_6",
      discord_link: "",
      whatsapp_link: "",
      max_slots: 20,
      status: "INSCRIÇÕES ABERTAS" as
        | "INSCRIÇÕES ABERTAS"
        | "INSCRIÇÕES ENCERRADAS"
        | "EM ANDAMENTO"
        | "FINALIZADO",
      important_info: "",
      is_private: false,
      invited_tags: [],
      table_image_url: "",
      is_live: false,
    });
    setBannerFile(null);
    setTableFile(null);
  };

  if (loading) {
    return (
      <MainLayout showUpcomingScrimWidget={false}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const isVerifiedOrganizer = organizerStats.totalTrainings >= 10 || isVerifiedByRole;

  const filteredTrainings = trainings.filter((t) => {
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.platform !== "all" && t.platform !== filters.platform) return false;
    if (filters.game !== "all" && t.game !== filters.game) return false;

    const dt = t.datetime ? new Date(t.datetime) : null;
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00`);
      if (!dt || dt < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59`);
      if (!dt || dt > to) return false;
    }

    return true;
  });

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <section className="mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase flex items-center gap-2">
              Painel do Organizador
              {isVerifiedOrganizer && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wide">
                  Verificado
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Seus treinos, inscrições e ações rápidas em um lugar só.
            </p>

            {/* Ações rápidas: 2 colunas no mobile, flex no desktop */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="xs" className="w-full sm:w-auto justify-center">
                  <Tv className="w-4 h-4" />
                  Tornefy TV
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tornefy TV</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Serviços de transmissão para elevar seus treinos e campeonatos.
                  </p>

                  <Card className="p-4 bg-card/80 border-border">
                    <p className="font-semibold uppercase">Pacote Base</p>
                    <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                      <li>Overlay profissional</li>
                      <li>Transmissão ao vivo</li>
                      <li>Clipes e destaques</li>
                    </ul>
                    <p className="mt-3 text-sm">
                      <span className="font-semibold">Valores:</span> sob consulta
                    </p>
                  </Card>

                  <Button asChild className="w-full">
                    <a
                      href="https://wa.me/5511930107478"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Chamar no WhatsApp
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    WhatsApp: (11) 93010-7478
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="xs"
              className="w-full sm:w-auto justify-center"
              onClick={() => navigate("/external-teams")}
            >
              <Users className="w-4 h-4" />
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
              <TrainingWizard userId={user?.id} onCreated={fetchTrainings} />
              <DialogTrigger asChild>
                <Button variant="outline" size="xs" className="w-full sm:w-auto justify-center">
                  <Plus className="w-4 h-4" />
                  Criar Treino
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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
                        game: template.game as
                          | "free_fire"
                          | "blood_strike"
                          | "farlight_84"
                          | "prime_rush"
                          | "battlefield_6",
                        mode: template.mode as "Solo" | "Duo" | "Squad",
                        platform: template.platform as "PC" | "Mobile" | "Misto",
                        max_slots: template.max_slots,
                        rounds: template.rounds,
                        points_per_kill: template.points_per_kill,
                        points_per_position: JSON.stringify(
                          template.points_per_position || []
                        ),
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
                  <Label htmlFor="important_info">Informações Importantes</Label>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="whatsapp_link">Link do WhatsApp</Label>
                    <Input
                      id="whatsapp_link"
                      type="url"
                      placeholder="https://chat.whatsapp.com/..."
                      value={trainingForm.whatsapp_link}
                      onChange={(e) =>
                        setTrainingForm({
                          ...trainingForm,
                          whatsapp_link: e.target.value,
                        })
                      }
                    />
                  </div>
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
                        Se ativado, apenas equipes com TAGs listadas abaixo podem se inscrever
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
                            .map((tag) => tag.trim().toUpperCase())
                            .filter((tag) => tag.length > 0);
                          setTrainingForm({
                            ...trainingForm,
                            invited_tags: tags,
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Separe as TAGs por vírgula ou espaço (ex: ABC, XYZ)
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
        </section>

        {trainings.length === 0 ? (
          <Card className="p-12 text-center backdrop-blur-sm bg-card/80 border-border">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Você ainda não criou nenhum treino</h2>
            <p className="text-muted-foreground">Comece criando seu primeiro treino</p>
          </Card>
        ) : (
          <>
            {/* Filtros */}
            <Card className="p-4 bg-card/80 border-border mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "Todos" },
                    { key: "INSCRIÇÕES ABERTAS", label: "Abertas" },
                    { key: "INSCRIÇÕES ENCERRADAS", label: "Encerradas" },
                    { key: "EM ANDAMENTO", label: "Em andamento" },
                    { key: "FINALIZADO", label: "Finalizados" },
                  ].map((tab) => (
                    <Button
                      key={tab.key}
                      variant={filters.status === tab.key ? "default" : "outline"}
                      size="sm"
                      className={
                        filters.status === tab.key
                          ? "bg-primary text-primary-foreground"
                          : "border-border"
                      }
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          status: tab.key as any,
                        }))
                      }
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>Jogo</Label>
                    <Select
                      value={filters.game}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, game: value as any }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="free_fire">Free Fire</SelectItem>
                        <SelectItem value="blood_strike">Blood Strike</SelectItem>
                        <SelectItem value="farlight_84">Farlight 84</SelectItem>
                        <SelectItem value="prime_rush">Prime Rush</SelectItem>
                        <SelectItem value="battlefield_6">Battlefield 6</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Plataforma</Label>
                    <Select
                      value={filters.platform}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, platform: value as any }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="PC">PC</SelectItem>
                        <SelectItem value="Mobile">Mobile</SelectItem>
                        <SelectItem value="Misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>De</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Até</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Mostrando <span className="font-semibold">{filteredTrainings.length}</span> de {trainings.length}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        status: "all",
                        platform: "all",
                        game: "all",
                        dateFrom: "",
                        dateTo: "",
                      } as any)
                    }
                  >
                    Limpar filtros
                  </Button>
                </div>
              </div>
            </Card>

            {filteredTrainings.length === 0 ? (
              <Card className="p-10 text-center bg-card/80 border-border">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-2">Nenhum treino encontrado</h2>
                <p className="text-muted-foreground text-sm">
                  Ajuste os filtros acima para ver seus treinos.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredTrainings.map((training) => (
                  <Card
                    key={training.id}
                    className="overflow-hidden backdrop-blur-sm bg-card/80 border-border hover:border-primary/50 transition-all"
                  >
                    <DynamicBanner
                      bannerUrl={training.banner_url}
                      title={`Banner do treino ${training.name}`}
                      primaryColor={training.primary_color}
                      secondaryColor={training.secondary_color}
                      heightClassName="h-28 sm:h-32 md:h-40"
                      className="rounded-none"
                      fallback={<TornefyBannerMark className="w-36 text-foreground/10" />}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
                      {training.is_live && (
                        <Badge className="absolute top-2 right-2 bg-destructive animate-glow-pulse">
                          AO VIVO
                        </Badge>
                      )}
                      <TrainingStatusBadge
                        status={training.status}
                        className="absolute top-2 left-2"
                      />
                    </DynamicBanner>

                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-lg line-clamp-1 uppercase">
                        {training.name}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(training.datetime), "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-primary" />
                        <span>
                          <span className="font-semibold">{training.registrations}</span>/{training.max_slots} equipes inscritas
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="secondary">{training.platform}</Badge>
                        <Badge variant="outline">{training.mode}</Badge>
                      </div>

                      <Separator />

                      {/* Ações (2 linhas responsivas) */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <RegisteredTeamsDialog trainingId={training.id} trainingName={training.name} />
                          <EventLogsDialog trainingId={training.id} trainingName={training.name} />
                          <ScoringConfigDialog
                            trainingId={training.id}
                            currentPointsPerKill={training.points_per_kill}
                            currentPointsPerPosition={training.points_per_position || []}
                            onConfigUpdated={fetchTrainings}
                          />
                        </div>

                        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-stretch">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => navigate(`/training/${training.id}`)}
                            className="w-full text-xs sm:text-sm"
                          >
                            <span className="hidden sm:inline">Ver Detalhes</span>
                            <span className="sm:hidden">Ver Detalhes</span>
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => openEditDialog(training)}
                            className="shrink-0"
                            aria-label="Editar treino"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleDeleteTraining(training.id)}
                            className="shrink-0 hover:text-destructive"
                            aria-label="Excluir treino"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Organizador Verificado */}
        <Card className="p-6 bg-card/80 border-border mt-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-bold uppercase">Organizador Verificado</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                O selo verificado destaca seu perfil e aumenta a confiança das equipes ao se
                inscreverem nos seus treinos.
              </p>
            </div>

            {isVerifiedOrganizer ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wide">
                Verificado
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-background/40 text-muted-foreground border border-border uppercase tracking-wide">
                Em progresso
              </span>
            )}
          </div>

          <div className="mt-5">
            {(() => {
              const target = 10;
              const current = organizerStats.totalTrainings || 0;
              const missing = Math.max(0, target - current);
              const pct = Math.min(100, Math.round((current / target) * 100));

              if (isVerifiedOrganizer) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Parabéns! Você já atingiu os requisitos para o selo.
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span className="tabular-nums">
                      {current} / {target} treinos
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Faltam <span className="font-semibold text-foreground">{missing}</span> treinos
                    para destravar o selo.
                  </p>
                </div>
              );
            })()}
          </div>
        </Card>
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
    </MainLayout>
  );
};

export default OrganizerDashboard;
