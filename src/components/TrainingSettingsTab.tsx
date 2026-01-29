import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon, Radio } from "lucide-react";
import { ExternalTeamDialog } from "@/components/ExternalTeamDialog";
import { AddExistingExternalTeamDialog } from "@/components/AddExistingExternalTeamDialog";
import { ScoreManagementDialog } from "@/components/ScoreManagementDialog";
import { ScoringConfigDialog } from "@/components/ScoringConfigDialog";
import { SaveTemplateDialog } from "@/components/SaveTemplateDialog";
import { SlotReorderDialog } from "@/components/SlotReorderDialog";
import { InvitedTeamsManager } from "@/components/InvitedTeamsManager";
import { TrainingColorEditor } from "@/components/TrainingColorEditor";
import { BroadcastLinksDialog } from "@/components/BroadcastLinksDialog";
import { ViewTeamsDialog } from "@/components/ViewTeamsDialog";


type TeamLite = { id: string; name: string; tag: string; logo_url: string | null };

interface TrainingSettingsTabProps {
  trainingId: string;
  userId: string;
  userEmail?: string | null;
  training: any;
  registeredTeams: any[];
  primaryColor: string;
  onUpdated: () => void;
}

function safeUrl(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

export function TrainingSettingsTab({
  trainingId,
  userId,
  userEmail,
  training,
  registeredTeams,
  primaryColor,
  onUpdated,
}: TrainingSettingsTabProps) {
  const [savingName, setSavingName] = useState(false);
  const [name, setName] = useState(training?.name || "");

  const [savingLinks, setSavingLinks] = useState(false);
  const [discordLink, setDiscordLink] = useState(training?.discord_link || "");
  const [whatsappLink, setWhatsappLink] = useState(training?.whatsapp_link || "");
  const [liveLink, setLiveLink] = useState(training?.live_link || "");

  const [savingStatus, setSavingStatus] = useState(false);
  const [status, setStatus] = useState(training?.status || "INSCRIÇÕES ABERTAS");
  const [isLive, setIsLive] = useState(training?.is_live || false);

  useEffect(() => {
    setName(training?.name || "");
    setDiscordLink(training?.discord_link || "");
    setWhatsappLink(training?.whatsapp_link || "");
    setLiveLink(training?.live_link || "");
    setStatus(training?.status || "INSCRIÇÕES ABERTAS");
    setIsLive(training?.is_live || false);
  }, [training?.name, training?.discord_link, training?.whatsapp_link, training?.live_link, training?.status, training?.is_live]);

  const teamsForScore = useMemo(
    () =>
      registeredTeams.map((r: any) => ({
        id: r.teams.id,
        name: r.teams.name,
        tag: r.teams.tag,
        logo_url: r.teams.logo_url,
      })) as TeamLite[],
    [registeredTeams]
  );

  const handleSaveName = async () => {
    const nextName = name.trim();
    if (!nextName) {
      toast.error("Digite um nome para o treino");
      return;
    }

    try {
      setSavingName(true);
      const { error } = await supabase
        .from("trainings")
        .update({ name: nextName })
        .eq("id", trainingId);

      if (error) throw error;
      toast.success("Nome do treino atualizado!");
      onUpdated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar nome");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveLinks = async () => {
    try {
      setSavingLinks(true);
      const payload = {
        discord_link: safeUrl(discordLink) || null,
        whatsapp_link: safeUrl(whatsappLink) || null,
        live_link: safeUrl(liveLink) || null,
      };

      const { error } = await supabase.from("trainings").update(payload).eq("id", trainingId);
      if (error) throw error;

      toast.success("Links atualizados!");
      onUpdated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar links");
    } finally {
      setSavingLinks(false);
    }
  };

  const persistStatus = async (nextStatus: string, nextIsLive: boolean) => {
    const { error } = await supabase
      .from("trainings")
      .update({ status: nextStatus, is_live: nextIsLive })
      .eq("id", trainingId);

    if (error) throw error;
  };

  const handleSaveStatus = async () => {
    try {
      setSavingStatus(true);
      await persistStatus(status, isLive);
      toast.success("Status atualizado!");
      onUpdated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar status");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCloseRegistrations = async () => {
    try {
      const nextStatus = "INSCRIÇÕES ENCERRADAS";
      setStatus(nextStatus);
      setSavingStatus(true);
      await persistStatus(nextStatus, isLive);
      toast.success("Inscrições encerradas!");
      onUpdated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao encerrar inscrições");
    } finally {
      setSavingStatus(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card/80 border-border">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">Configurações</h2>
            <p className="text-xs text-muted-foreground">
              Tudo do organizador em um só lugar.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {userEmail || "organizer"}
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <Label htmlFor="trainingName">Nome do Treino</Label>
            <Input
              id="trainingName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: X-TREINO TORNEFY"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleSaveName}
                disabled={savingName}
                style={{ backgroundColor: primaryColor }}
              >
                {savingName ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Nome"
                )}
              </Button>
              <Badge variant="outline" className="text-xs">
                 ID: {trainingId}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Links do evento</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure Discord, WhatsApp e link da live.
            </p>

            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="discordLink">Discord</Label>
                <Input
                  id="discordLink"
                  value={discordLink}
                  onChange={(e) => setDiscordLink(e.target.value)}
                  placeholder="https://discord.gg/..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="whatsappLink">WhatsApp</Label>
                <Input
                  id="whatsappLink"
                  value={whatsappLink}
                  onChange={(e) => setWhatsappLink(e.target.value)}
                  placeholder="https://wa.me/..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="liveLink">Live</Label>
                <Input
                  id="liveLink"
                  value={liveLink}
                  onChange={(e) => setLiveLink(e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="pt-1">
                <Button
                  onClick={handleSaveLinks}
                  disabled={savingLinks}
                  style={{ backgroundColor: primaryColor }}
                >
                  {savingLinks ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar links"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Status do Treino</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure o status atual e se está ao vivo.
            </p>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="training-status">Status</Label>
                <RadioGroup value={status} onValueChange={setStatus}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INSCRIÇÕES ABERTAS" id="status-open" />
                    <Label htmlFor="status-open" className="cursor-pointer font-normal">INSCRIÇÕES ABERTAS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INSCRIÇÕES ENCERRADAS" id="status-closed" />
                    <Label htmlFor="status-closed" className="cursor-pointer font-normal">INSCRIÇÕES ENCERRADAS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="EM ANDAMENTO" id="status-progress" />
                    <Label htmlFor="status-progress" className="cursor-pointer font-normal">EM ANDAMENTO</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FINALIZADO" id="status-finished" />
                    <Label htmlFor="status-finished" className="cursor-pointer font-normal">FINALIZADO</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <Label htmlFor="is-live" className="cursor-pointer">Transmissão AO VIVO</Label>
                  <p className="text-xs text-muted-foreground">Mostrar badge de AO VIVO no treino</p>
                </div>
                <Switch id="is-live" checked={isLive} onCheckedChange={setIsLive} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveStatus}
                  disabled={savingStatus}
                  style={{ backgroundColor: primaryColor }}
                >
                  {savingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Status"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCloseRegistrations}
                  disabled={savingStatus || status === "INSCRIÇÕES ENCERRADAS"}
                >
                  Encerrar inscrições
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/80 border-border">
        <div>
          <h3 className="font-semibold">Ações</h3>
          <p className="text-xs text-muted-foreground">
            Gerencie slots, convidados, pontuação e templates.
          </p>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <BroadcastLinksDialog trainingId={trainingId} />
          <ViewTeamsDialog trainingId={trainingId} />
          <SlotReorderDialog trainingId={trainingId} onSlotsUpdated={onUpdated} />
          <ExternalTeamDialog trainingId={trainingId} organizerId={userId} onTeamCreated={onUpdated} />
          <AddExistingExternalTeamDialog trainingId={trainingId} organizerId={userId} onTeamAdded={onUpdated} />
          <ScoreManagementDialog
            trainingId={trainingId}
            teams={teamsForScore}
            pointsPerKill={training?.points_per_kill || 1}
            pointsPerPosition={Array.isArray(training?.points_per_position) ? training.points_per_position : []}
            onScoresUpdated={onUpdated}
          />
          <ScoringConfigDialog
            trainingId={trainingId}
            currentPointsPerKill={training?.points_per_kill || 1}
            currentPointsPerPosition={Array.isArray(training?.points_per_position) ? training.points_per_position : []}
            onConfigUpdated={onUpdated}
          />
          <SaveTemplateDialog training={training} organizerId={userId} />
        </div>

        <div className="mt-4 flex justify-center">
          <TrainingColorEditor
            trainingId={trainingId}
            currentPrimaryColor={training?.primary_color || "#9146FF"}
            currentSecondaryColor={training?.secondary_color || "#1F2937"}
            onColorsUpdated={onUpdated}
          />
        </div>
      </Card>

      <InvitedTeamsManager
        trainingId={trainingId}
        primaryColor={primaryColor}
        isPrivate={!!training?.is_private}
        invitedTags={Array.isArray(training?.invited_tags) ? training.invited_tags : []}
        onSaved={onUpdated}
      />
    </div>
  );
}
