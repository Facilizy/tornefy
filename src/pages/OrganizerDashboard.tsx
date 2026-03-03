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
  DialogClose,
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Sparkles,
  Coins,
} from "lucide-react";

import { RegisteredTeamsDialog } from "@/components/RegisteredTeamsDialog";
import { EventLogsDialog } from "@/components/EventLogsDialog";
import { BlacklistDialog } from "@/components/BlacklistDialog";
import { ScoringConfigDialog } from "@/components/ScoringConfigDialog";
import { UseTemplateDialog } from "@/components/UseTemplateDialog";
import { CreateScrimDialog } from "@/components/organizer/CreateScrimDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";
import { DynamicBanner } from "@/components/DynamicBanner";
import TornefyBannerMark from "@/components/TornefyBannerMark";
import { PaymentComingSoon } from "@/components/payments/PaymentComingSoon";
import { PrizeLinesEditor } from "@/components/scrims/PrizeLinesEditor";


const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    kind: "all" as "all" | "training" | "tournament",
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
      | "pubg_mobile",
    dateFrom: "", // YYYY-MM-DD
    dateTo: "", // YYYY-MM-DD
  });
  const { role, loading: roleLoading } = useUserRole(user?.id);
  const [isVerifiedByRole, setIsVerifiedByRole] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [createScrimOpen, setCreateScrimOpen] = useState(false);
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
    kind: "training" as "training" | "tournament",
    name: "",
    banner_url: "",
    datetime: "",
    rounds: 3,
    points_per_kill: 1,
    points_per_position: "[]",
    platform: "PC" as "PC" | "Mobile" | "Misto",
    mode: "Squad" as "Solo" | "Duo" | "Squad",
    game: "free_fire" as "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "pubg_mobile",
    discord_link: "",
    whatsapp_link: "",
    max_slots: 20,
    status: "INSCRIÇÕES ABERTAS" as
      | "INSCRIÇÕES ABERTAS"
      | "INSCRIÇÕES ENCERRADAS"
      | "EM ANDAMENTO"
      | "FINALIZADO",
    important_info: "",
    rules: "",
    is_private: false,
    invited_tags: [] as string[],
    table_image_url: "",
    is_live: false,
    entry_fee_coins: 0,
    prize_coins: 0,
    prize: "",

    // Subscription gating
    subscription_access_mode: "public" as "public" | "members_only",
    allowed_plan_ids: [] as string[],

    // Legacy compat (kept so other parts of the app don't break)
    required_plan_id: "" as string,
  });

  const [invitedTagsText, setInvitedTagsText] = useState("");

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [tableFile, setTableFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showScoringComingSoon, setShowScoringComingSoon] = useState(false);

  const [showPrizeRaw, setShowPrizeRaw] = useState(false);

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

  const fetchPlans = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("organizer_subscription_plans")
        .select("id,name,monthly_fee_coins,period_days,active")
        .eq("organizer_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPlans(data || []);
    } catch {
      setPlans([]);
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
      void fetchPlans();
    } catch (error: any) {
      toast.error("Erro ao carregar treinos");
    } finally {
      setLoading(false);
    }
  };

  // Torneios foram unificados em Scrims (trainings.kind='tournament'), então não buscamos mais a tabela legacy `tournaments`.

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

  const syncTrainingAllowedPlans = async (trainingId: string, mode: "public" | "members_only", planIds: string[]) => {
    const safeTrainingId = String(trainingId);
    const uniquePlanIds = Array.from(new Set((planIds || []).map(String).filter(Boolean)));

    if (mode !== "members_only" || uniquePlanIds.length === 0) {
      // remove all mappings
      await supabase.from("training_allowed_plans").delete().eq("training_id", safeTrainingId);
      return;
    }

    const { data: existingRows } = await supabase
      .from("training_allowed_plans")
      .select("plan_id")
      .eq("training_id", safeTrainingId);

    const existing = new Set((existingRows || []).map((r: any) => String(r.plan_id)));
    const desired = new Set(uniquePlanIds);

    const toInsert = uniquePlanIds.filter((pid) => !existing.has(pid));
    const toDelete = Array.from(existing).filter((pid) => !desired.has(pid));

    if (toInsert.length > 0) {
      const insertPayload = toInsert.map((pid) => ({ training_id: safeTrainingId, plan_id: pid }));
      const { error: insErr } = await supabase.from("training_allowed_plans").insert(insertPayload);
      if (insErr) throw insErr;
    }

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("training_allowed_plans")
        .delete()
        .eq("training_id", safeTrainingId)
        .in("plan_id", toDelete);
      if (delErr) throw delErr;
    }
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

      const rawDatetime = (trainingForm.datetime ?? "").trim();
      const parsedDatetime = rawDatetime ? new Date(rawDatetime) : null;
      if (rawDatetime && Number.isNaN(parsedDatetime?.getTime())) {
        throw new Error("Data e hora inválidas");
      }

      // Defesa extra: nunca enviar "" para coluna timestamp.
      // Se por algum motivo o input vier vazio no modo editar, mantemos o valor atual.
      const datetimeToSave = parsedDatetime
        ? parsedDatetime.toISOString()
        : editingTraining?.datetime
          ? String(editingTraining.datetime)
          : null;

      console.log("[OrganizerDashboard] saveTraining", {
        editing: !!editingTraining,
        rawDatetime,
        datetimeToSave,
      });

      const mode = trainingForm.subscription_access_mode;
      const allowedPlanIds = Array.from(
        new Set((trainingForm.allowed_plan_ids || []).map(String).filter(Boolean))
      );

      if (mode === "members_only" && allowedPlanIds.length === 0) {
        throw new Error("Selecione pelo menos 1 plano para liberar a inscrição.");
      }

      const trainingData: any = {
        kind: trainingForm.kind,
        name: trainingForm.name,
        banner_url: bannerUrl || null,
        // datetime-local ("YYYY-MM-DDTHH:mm") precisa virar ISO com timezone,
        // senão o banco interpreta como UTC e o horário aparece deslocado.
        datetime: datetimeToSave,
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
        rules: String((trainingForm as any).rules || "").trim() || null,
        is_private: trainingForm.is_private,
        invited_tags: trainingForm.invited_tags,
        organizer_id: user.id,
        table_image_url: tableImageUrl || null,
        entry_fee_coins: Math.max(0, Math.trunc(Number((trainingForm as any).entry_fee_coins) || 0)),
        prize_coins: Math.max(0, Math.trunc(Number((trainingForm as any).prize_coins) || 0)),
        prize: String((trainingForm as any).prize || "").trim() || null,

        subscription_access_mode: mode,

        // legacy compat (keep as first allowed plan)
        required_plan_id: mode === "members_only" ? allowedPlanIds[0] : null,
      };

      // Se datetimeToSave é null, removemos a chave pra evitar qualquer coerção para "".
      if (trainingData.datetime === null) delete trainingData.datetime;

      if (editingTraining) {
        const { error } = await supabase
          .from("trainings")
          .update(trainingData)
          .eq("id", editingTraining.id);

        if (error) throw error;

        await syncTrainingAllowedPlans(String(editingTraining.id), mode, allowedPlanIds);

        toast.success("Treino atualizado!");
      } else {
        const trainingId = crypto.randomUUID();
        const { error } = await supabase
          .from("trainings")
          .insert({ ...trainingData, id: trainingId });

        if (error) throw error;

        await syncTrainingAllowedPlans(String(trainingId), mode, allowedPlanIds);

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

  const openEditDialog = async (training: any) => {
    setEditingTraining(training);

    // Load allowed plans (multi-plan)
    let allowedPlanIds: string[] = [];
    try {
      const { data } = await supabase
        .from("training_allowed_plans")
        .select("plan_id")
        .eq("training_id", String(training.id));
      allowedPlanIds = Array.from(new Set((data || []).map((r: any) => String(r.plan_id)).filter(Boolean)));
    } catch {
      allowedPlanIds = [];
    }

    // Fallback to legacy required_plan_id
    if (allowedPlanIds.length === 0 && training.required_plan_id) {
      allowedPlanIds = [String(training.required_plan_id)];
    }

    const inferredMode = (training.subscription_access_mode ||
      (allowedPlanIds.length > 0 ? "members_only" : "public")) as "public" | "members_only";

    // Converter ISO (armazenado) para datetime-local (input)
    let formattedDatetime = "";
    if (training.datetime) {
      const date = new Date(training.datetime);
      // converter para "local" antes de cortar, senão fica deslocado
      formattedDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }

    const initialTags = (training.invited_tags || []) as string[];

    setTrainingForm({
      kind: (training.kind || "training") as any,
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
        | "pubg_mobile",
      discord_link: training.discord_link || "",
      whatsapp_link: training.whatsapp_link || "",
      max_slots: training.max_slots,
      status: training.status || "INSCRIÇÕES ABERTAS",
      important_info: training.important_info || "",
      rules: training.rules || "",
      is_private: training.is_private || false,
      invited_tags: initialTags,
      table_image_url: training.table_image_url || "",
      is_live: training.is_live || false,
      entry_fee_coins: Number(training.entry_fee_coins || 0) || 0,
      prize_coins: Number((training as any).prize_coins || 0) || 0,
      prize: String((training as any).prize || ""),

      subscription_access_mode: inferredMode,
      allowed_plan_ids: allowedPlanIds,

      // legacy compat
      required_plan_id: allowedPlanIds[0] ? String(allowedPlanIds[0]) : "",
    });

    setInvitedTagsText(initialTags.join(", "));
    setBannerFile(null);
    setTableFile(null);
    setDialogOpen(true);
  };


  const resetForm = () => {
    setTrainingForm({
      kind: "training",
      name: "",
      banner_url: "",
      datetime: "",
      rounds: 3,
      points_per_kill: 1,
      points_per_position: "[]",
      platform: "PC" as "PC" | "Mobile" | "Misto",
      mode: "Squad" as "Solo" | "Duo" | "Squad",
      game: "free_fire" as "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "pubg_mobile",
      discord_link: "",
      whatsapp_link: "",
      max_slots: 20,
      status: "INSCRIÇÕES ABERTAS" as
        | "INSCRIÇÕES ABERTAS"
        | "INSCRIÇÕES ENCERRADAS"
        | "EM ANDAMENTO"
        | "FINALIZADO",
      important_info: "",
      rules: "",
      is_private: false,
      invited_tags: [],
      table_image_url: "",
      is_live: false,
      entry_fee_coins: 0,
      prize_coins: 0,
      prize: "",

      subscription_access_mode: "public",
      allowed_plan_ids: [],

      required_plan_id: "",
    });
    setInvitedTagsText("");
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

  const filterByCommon = (item: any) => {
    if (filters.status !== "all" && String(item.status || "") !== String(filters.status)) return false;
    if (filters.platform !== "all" && String(item.platform || "") !== String(filters.platform)) return false;
    if (filters.game !== "all" && String(item.game || "") !== String(filters.game)) return false;

    const dt = item.datetime ? new Date(item.datetime) : null;
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00`);
      if (!dt || dt < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59`);
      if (!dt || dt > to) return false;
    }

    return true;
  };

  const filteredTrainings = trainings.filter((t) => filterByCommon(t));

  const combined = filteredTrainings
    .map((t) => ({
      kind: (t.kind || "training") as "training" | "tournament",
      dt: t.datetime ? new Date(t.datetime).getTime() : 0,
      data: t,
    }))
    .filter((r) => {
      if (filters.kind === "training") return r.kind === "training";
      if (filters.kind === "tournament") return r.kind === "tournament";
      return true;
    })
    .sort((a, b) => (b.dt || 0) - (a.dt || 0));

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <CreateScrimDialog
        open={createScrimOpen}
        onOpenChange={setCreateScrimOpen}
        onContinue={(preset) => {
          setEditingTraining(null);
          setTrainingForm((prev) => ({
            ...prev,
            kind: preset.kind,
            entry_fee_coins: preset.entry_fee_coins,
          } as any));
          setDialogOpen(true);
        }}
      />

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

                <DialogContent className="bg-card border-border max-w-2xl w-[95vw] sm:w-full p-0">
                  <div className="flex max-h-[90vh] flex-col">
                    <div className="border-b border-border p-5">
                      <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Tornefy TV</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                          Serviços de transmissão para elevar seus treinos e campeonatos.
                        </p>
                      </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                      <div className="space-y-4">
                        <Card className="rounded-xl border-border bg-background/30 p-5">
                          <p className="text-sm font-black uppercase tracking-wide">Pacote Base</p>
                          <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                            <li>Overlay profissional</li>
                            <li>Transmissão ao vivo</li>
                            <li>Clipes e destaques</li>
                          </ul>
                          <p className="mt-4 text-sm">
                            <span className="font-semibold">Valores:</span> sob consulta
                          </p>
                        </Card>

                        <Card className="rounded-xl border-border bg-background/30 p-5">
                          <p className="text-sm font-black uppercase tracking-wide">Contato</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            WhatsApp: <span className="font-semibold">(11) 93010-7478</span>
                          </p>
                        </Card>
                      </div>
                    </div>

                    <div className="border-t border-border p-5">
                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            Fechar
                          </Button>
                        </DialogClose>
                        <Button asChild className="bg-gradient-primary">
                          <a href="https://wa.me/5511930107478" target="_blank" rel="noopener noreferrer">
                            Chamar no WhatsApp
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <PaymentComingSoon compact title="Planos" />

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
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    type="button"
                    size="xs"
                    className="w-full sm:w-auto justify-center bg-gradient-primary gap-2"
                    onClick={() => setCreateScrimOpen(true)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Criar Scrim
                  </Button>
                </div>
                <DialogContent className="bg-card border-border max-w-3xl w-[95vw] sm:w-full p-0">
                  <div className="flex max-h-[90vh] flex-col">
                    <div className="border-b border-border p-5">
                      <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">
                          {editingTraining ? "Editar Treino" : "Criar Treino"}
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                          Ajuste regras, vagas, quedas e links — tudo fica salvo no seu painel.
                        </p>
                      </DialogHeader>

                      {/* Use Template Button */}
                      {!editingTraining && user && (
                        <div className="mt-4">
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
                                  | "pubg_mobile",
                                mode: template.mode as "Solo" | "Duo" | "Squad",
                                platform: template.platform as "PC" | "Mobile" | "Misto",
                                max_slots: template.max_slots,
                                rounds: template.rounds,
                                points_per_kill: template.points_per_kill,
                                points_per_position: JSON.stringify(template.points_per_position || []),
                                important_info: template.important_info || "",
                                discord_link: template.discord_link || "",
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                      <form id="training-form" onSubmit={handleSaveTraining} className="space-y-6">
                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Básico</h3>
                            <Separator className="ml-3 flex-1" />
                          </div>

                          <div>
                            <Label htmlFor="name">Nome do Treino</Label>
                            <Input
                              id="name"
                              value={trainingForm.name}
                              onChange={(e) => setTrainingForm({ ...trainingForm, name: e.target.value })}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="game">Jogo</Label>
                              <Select
                                value={trainingForm.game}
                                onValueChange={(value: "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "pubg_mobile") =>
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
                                  <SelectItem value="pubg_mobile">PUBG Mobile</SelectItem>
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
                                <p className="mt-1 text-xs text-muted-foreground">Banner atual carregado</p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                Recomendado: 1920x400px (4.8:1) | Máximo: 5MB
                              </p>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Configuração</h3>
                            <Separator className="ml-3 flex-1" />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="datetime">Data e Hora</Label>
                              <Input
                                id="datetime"
                                type="datetime-local"
                                value={trainingForm.datetime}
                                onChange={(e) => setTrainingForm({ ...trainingForm, datetime: e.target.value })}
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

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                              <Label htmlFor="status">Status do Treino</Label>
                              <Select
                                value={trainingForm.status}
                                onValueChange={(
                                  value:
                                    | "INSCRIÇÕES ABERTAS"
                                    | "INSCRIÇÕES ENCERRADAS"
                                    | "EM ANDAMENTO"
                                    | "FINALIZADO",
                                ) => setTrainingForm({ ...trainingForm, status: value })}
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
                              <Label htmlFor="entry_fee">Entrada</Label>
                              <Select
                                value={Number((trainingForm as any).entry_fee_coins || 0) > 0 ? "paid" : "free"}
                                onValueChange={(v) => {
                                  if (v === "paid") {
                                    setTrainingForm({
                                      ...trainingForm,
                                      entry_fee_coins: Math.max(1, Number((trainingForm as any).entry_fee_coins || 10)),
                                    } as any);
                                  } else {
                                    setTrainingForm({ ...trainingForm, entry_fee_coins: 0 } as any);
                                  }
                                }}
                              >
                                <SelectTrigger id="entry_fee" className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Gratuito</SelectItem>
                                  <SelectItem value="paid">Pago (TorneCoins)</SelectItem>
                                </SelectContent>
                              </Select>
                              {Number((trainingForm as any).entry_fee_coins || 0) > 0 ? (
                                <Input
                                  className="mt-2"
                                  inputMode="numeric"
                                  placeholder="ex: 10"
                                  value={String((trainingForm as any).entry_fee_coins || "")}
                                  onChange={(e) => {
                                    const raw = Number(String(e.target.value).replace(/[^0-9]/g, ""));
                                    const next = Number.isFinite(raw)
                                      ? Math.max(1, Math.min(999999, Math.trunc(raw)))
                                      : 1;
                                    setTrainingForm({ ...trainingForm, entry_fee_coins: next } as any);
                                  }}
                                />
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">Sem taxa de entrada.</p>
                              )}
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
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                              Premiação e Regras
                            </h3>
                            <Separator className="ml-3 flex-1" />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="prize_coins">Premiação (TC)</Label>
                              <Input
                                id="prize_coins"
                                className="mt-2"
                                inputMode="numeric"
                                placeholder="ex: 100"
                                value={String((trainingForm as any).prize_coins ?? 0)}
                                onChange={(e) => {
                                  const raw = Number(String(e.target.value).replace(/[^0-9]/g, ""));
                                  const next = Number.isFinite(raw)
                                    ? Math.max(0, Math.min(999999, Math.trunc(raw)))
                                    : 0;
                                  setTrainingForm({ ...trainingForm, prize_coins: next } as any);
                                }}
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                Dica: se você usar o editor abaixo com “Somar total automaticamente”, esse valor se ajusta sozinho.
                              </p>
                            </div>

                            <div className="rounded-xl border border-border bg-background/30 p-4">
                              <PrizeLinesEditor
                                value={String((trainingForm as any).prize || "")}
                                prizeCoins={Number((trainingForm as any).prize_coins ?? 0)}
                                onPrizeCoinsChange={(next) => setTrainingForm({ ...trainingForm, prize_coins: next } as any)}
                                onChange={(next) => setTrainingForm({ ...trainingForm, prize: next } as any)}
                              />

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-3 w-full"
                                onClick={() => setShowPrizeRaw((s) => !s)}
                              >
                                {showPrizeRaw ? "Ocultar texto" : "Editar como texto"}
                              </Button>

                              {showPrizeRaw ? (
                                <div className="mt-3">
                                  <Label htmlFor="prize_text">Premiação (texto)</Label>
                                  <Textarea
                                    id="prize_text"
                                    className="mt-2 min-h-[120px]"
                                    placeholder={"1º lugar - 100 TC\n2º lugar - 50 TC\n3º lugar - 15 TC\nMVP - 25 TC"}
                                    value={String((trainingForm as any).prize || "")}
                                    onChange={(e) => setTrainingForm({ ...trainingForm, prize: e.target.value } as any)}
                                  />
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Uma linha por item.
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="rules">Regras</Label>
                            <Textarea
                              id="rules"
                              rows={6}
                              placeholder="Digite as regras da scrim..."
                              value={String((trainingForm as any).rules || "")}
                              onChange={(e) => setTrainingForm({ ...trainingForm, rules: e.target.value } as any)}
                            />
                          </div>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Infos e Links</h3>
                            <Separator className="ml-3 flex-1" />
                          </div>

                          <div>
                            <Label htmlFor="important_info">Informações Importantes</Label>
                            <Textarea
                              id="important_info"
                              rows={4}
                              placeholder="Adicione informações importantes sobre o treino..."
                              value={trainingForm.important_info}
                              onChange={(e) => setTrainingForm({ ...trainingForm, important_info: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="discord_link">Link do Discord</Label>
                              <Input
                                id="discord_link"
                                type="url"
                                placeholder="https://discord.gg/..."
                                value={trainingForm.discord_link}
                                onChange={(e) => setTrainingForm({ ...trainingForm, discord_link: e.target.value })}
                              />
                            </div>

                            <div>
                              <Label htmlFor="whatsapp_link">Link do WhatsApp</Label>
                              <Input
                                id="whatsapp_link"
                                type="url"
                                placeholder="https://chat.whatsapp.com/..."
                                value={trainingForm.whatsapp_link}
                                onChange={(e) => setTrainingForm({ ...trainingForm, whatsapp_link: e.target.value })}
                              />
                            </div>
                          </div>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Privacidade</h3>
                            <Separator className="ml-3 flex-1" />
                          </div>

                          <div className="flex items-center justify-between rounded-lg border border-border bg-background/30 p-4">
                            <div>
                              <Label htmlFor="is_live">Treino está ao vivo?</Label>
                              <p className="text-xs text-muted-foreground">Ative para destacar e exibir status de live.</p>
                            </div>
                            <Switch
                              id="is_live"
                              checked={trainingForm.is_live}
                              onCheckedChange={(checked) => setTrainingForm({ ...trainingForm, is_live: checked })}
                            />
                          </div>

                          <div className="space-y-3 rounded-lg border border-border bg-background/30 p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <Label>Acesso por assinatura</Label>
                                <p className="text-xs text-muted-foreground">
                                  Público ou exclusivo para assinantes (qualquer 1 plano selecionado libera a inscrição).
                                </p>
                              </div>

                              <div className="w-[260px] max-w-full">
                                <Select
                                  value={trainingForm.subscription_access_mode}
                                  onValueChange={(v) => {
                                    const nextMode = (v === "members_only" ? "members_only" : "public") as
                                      | "public"
                                      | "members_only";
                                    setTrainingForm((prev) => ({
                                      ...prev,
                                      subscription_access_mode: nextMode,
                                      allowed_plan_ids: nextMode === "public" ? [] : prev.allowed_plan_ids,
                                      required_plan_id: nextMode === "public" ? "" : prev.required_plan_id,
                                    }));
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="public">Público</SelectItem>
                                    <SelectItem value="members_only">Somente assinantes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {trainingForm.subscription_access_mode === "members_only" ? (
                              <div className="mt-3 space-y-2">
                                {plans.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Você ainda não tem planos. Crie em “Planos” no topo.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {(plans || []).map((p: any) => {
                                      const pid = String(p.id);
                                      const checked = trainingForm.allowed_plan_ids.includes(pid);
                                      const label = `${String(p.name)} · ${Number(p.monthly_fee_coins || 0)} TC / ${Number(p.period_days || 30)} dias`;

                                      return (
                                        <label
                                          key={pid}
                                          className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-3"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(next) => {
                                              const nextChecked = !!next;
                                              setTrainingForm((prev) => {
                                                const nextIds = nextChecked
                                                  ? Array.from(new Set([...(prev.allowed_plan_ids || []), pid]))
                                                  : (prev.allowed_plan_ids || []).filter((id) => id !== pid);
                                                return {
                                                  ...prev,
                                                  allowed_plan_ids: nextIds,
                                                  required_plan_id: nextIds[0] ? String(nextIds[0]) : "",
                                                };
                                              });
                                            }}
                                          />
                                          <span className="text-sm font-semibold leading-tight">{label}</span>
                                        </label>
                                      );
                                    })}
                                    <p className="text-xs text-muted-foreground">
                                      Qualquer 1 plano marcado libera a inscrição.
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>


                          <div className="space-y-3 rounded-lg border border-border bg-background/30 p-4">
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
                                onCheckedChange={(checked) => setTrainingForm({ ...trainingForm, is_private: checked })}
                              />
                            </div>

                            {trainingForm.is_private && (
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="invited_tags">TAGs das Equipes Convidadas</Label>
                                  <Input
                                    id="invited_tags"
                                    placeholder="Ex: LOUD, FLUXO, LOS"
                                    value={invitedTagsText}
                                    onChange={(e) => {
                                      const nextText = e.target.value;
                                      setInvitedTagsText(nextText);

                                      const tags = nextText
                                        .split(/[\s,]+/)
                                        .map((tag) => tag.trim().toUpperCase())
                                        .filter((tag) => tag.length > 0);

                                      setTrainingForm({ ...trainingForm, invited_tags: tags });
                                    }}
                                  />
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Separe as TAGs por vírgula ou espaço (ex: LOUD, FLUXO)
                                  </p>
                                </div>

                                {trainingForm.invited_tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {trainingForm.invited_tags.map((tag) => (
                                      <Button
                                        key={tag}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-2 rounded-full"
                                        onClick={() => {
                                          const nextTags = trainingForm.invited_tags.filter((t) => t !== tag);
                                          setTrainingForm({ ...trainingForm, invited_tags: nextTags });
                                          setInvitedTagsText(nextTags.join(", "));
                                        }}
                                        aria-label={`Remover tag ${tag}`}
                                      >
                                        <span className="font-black tracking-wide">{tag}</span>
                                        <span className="text-muted-foreground">×</span>
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {trainingForm.table_image_url && (
                            <div className="flex items-center justify-between rounded-lg border border-border bg-background/30 p-4">
                              <div>
                                <Label>Tabela de Resultados Atual</Label>
                                <p className="text-xs text-muted-foreground">Você pode remover e reenviar uma nova depois.</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setTrainingForm({ ...trainingForm, table_image_url: "" })}
                              >
                                Remover
                              </Button>
                            </div>
                          )}
                        </section>
                      </form>
                    </div>

                    <div className="border-t border-border p-5">
                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                          disabled={uploading}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          form="training-form"
                          className="bg-gradient-primary"
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : editingTraining ? (
                            "Salvar Alterações"
                          ) : (
                            "Criar Treino"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <BlacklistDialog />
            </div>
          </div>
        </section>

        <PaymentComingSoon
          className="mb-4"
          title="Recebíveis (TorneCoins)"
          description="O painel de recebíveis e movimentações financeiras estará disponível em breve."
        />

        {trainings.length === 0 ? (
          <Card className="p-12 text-center backdrop-blur-sm bg-card/80 border-border">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Você ainda não criou nenhum scrim</h2>
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
                        <SelectItem value="pubg_mobile">PUBG Mobile</SelectItem>
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

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Mostrando <span className="font-semibold">{combined.length}</span> de {trainings.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {(
                        [
                          { key: "all", label: "Todos" },
                          { key: "training", label: "Treinos" },
                          { key: "tournament", label: "Torneios" },
                        ] as const
                      ).map((k) => (
                        <Button
                          key={k.key}
                          variant={filters.kind === k.key ? "default" : "outline"}
                          size="sm"
                          className={filters.kind === k.key ? "bg-primary text-primary-foreground" : "border-border"}
                          onClick={() => setFilters((prev) => ({ ...prev, kind: k.key }))}
                        >
                          {k.label}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFilters({
                          kind: "all",
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
              </div>
            </Card>

            {combined.length === 0 ? (
              <Card className="p-10 text-center bg-card/80 border-border">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-2">Nenhum scrim encontrado</h2>
                <p className="text-muted-foreground text-sm">
                  Ajuste os filtros acima para ver seus scrims.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {combined.map((row) => {
                  const training = row.data as any;
                  const kindLabel = row.kind === "tournament" ? "SCRIM • TORNEIO" : "SCRIM • TREINO";
                  return (
                    <Card
                      key={`scrim:${training.id}`}
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
                        <Badge className="absolute top-2 left-2" variant="secondary">
                          {kindLabel}
                        </Badge>
                        <TrainingStatusBadge status={training.status} className="absolute top-10 left-2" />
                        {Number(training.entry_fee_coins || 0) > 0 ? (
                          <Badge className="absolute top-2 right-2" variant="outline">
                            {Number(training.entry_fee_coins)} TC
                          </Badge>
                        ) : null}
                        {training.is_live && (
                          <Badge className="absolute top-10 right-2 bg-destructive animate-glow-pulse">
                            AO VIVO
                          </Badge>
                        )}
                      </DynamicBanner>

                      <div className="p-4 space-y-3">
                        <h3 className="font-semibold text-lg line-clamp-1 uppercase">{training.name}</h3>

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

                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-stretch">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => navigate(`/scrim/${training.id}`)}
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
                  );
                })}
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
