import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, UserPlus, UserMinus, Trophy, Calendar, Settings, Users, ListChecks, ClipboardList, Flag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EventLog {
  id: string;
  team_id: string | null;
  team_name: string;
  team_tag: string;
  action: string;
  created_at: string;
}

function parseAction(action: string): { type: string; raw: any; summary?: string } {
  try {
    const parsed = JSON.parse(action);
    if (parsed && typeof parsed.type === "string") {
      const summary =
        typeof parsed.summary === "string"
          ? parsed.summary
          : typeof parsed.message === "string"
            ? parsed.message
            : undefined;
      return { type: parsed.type, raw: parsed, summary };
    }
  } catch {
    // ignore
  }
  return { type: action, raw: null, summary: undefined };
}

function getEventIcon(type: string) {
  if (type === "joined") return <UserPlus className="w-5 h-5 text-primary flex-shrink-0" />;
  if (type === "left" || type === "removed") return <UserMinus className="w-5 h-5 text-destructive flex-shrink-0" />;
  if (type === "score_saved" || type === "ranking_update") return <Trophy className="w-5 h-5 text-primary flex-shrink-0" />;

  if (type.startsWith("training_")) {
    if (type.includes("datetime")) return <Calendar className="w-5 h-5 text-primary flex-shrink-0" />;
    if (type.includes("status")) return <Flag className="w-5 h-5 text-primary flex-shrink-0" />;
    return <Settings className="w-5 h-5 text-primary flex-shrink-0" />;
  }

  if (type.startsWith("waitlist_")) return <ListChecks className="w-5 h-5 text-primary flex-shrink-0" />;
  if (type === "checkin") return <Users className="w-5 h-5 text-primary flex-shrink-0" />;
  if (type.startsWith("match_")) return <ClipboardList className="w-5 h-5 text-primary flex-shrink-0" />;
  if (type === "score_deleted") return <Trophy className="w-5 h-5 text-muted-foreground flex-shrink-0" />;

  return <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />;
}

function getEventLabel(type: string, summary?: string) {
  if (summary) return summary;
  if (type === "joined") return "Inscreveu-se";
  if (type === "left") return "Saiu";
  if (type === "removed") return "Removida";
  if (type === "score_saved") return "Pontuação atualizada";
  if (type === "checkin") return "Check-in realizado";
  if (type === "waitlist_joined") return "Entrou na fila de espera";
  if (type === "waitlist_left") return "Saiu da fila de espera";
  if (type === "waitlist_status_changed") return "Status da fila de espera alterado";
  if (type === "match_created") return "Partida criada";
  if (type === "match_updated") return "Partida atualizada";
  if (type === "match_deleted") return "Partida removida";
  if (type === "score_deleted") return "Pontuação removida";
  if (type.startsWith("training_")) return "Treino atualizado";
  if (type === "training_updated") return "Treino atualizado";
  return "Evento";
}

interface EventLogsDialogProps {
  trainingId: string;
  trainingName: string;
}

export const EventLogsDialog = ({ trainingId, trainingName }: EventLogsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, trainingId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("training_event_logs")
        .select("*")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar logs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" className="w-full justify-center gap-2">
          <FileText className="w-4 h-4" />
          Logs do Treino
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl w-[95vw] sm:w-full p-0">
        <div className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Logs de Eventos</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {trainingName} • histórico de inscrições, alterações e pontuações.
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-hidden p-5">
            <ScrollArea className="h-full pr-4">
              {loading ? (
                <div className="flex justify-center py-10 text-sm text-muted-foreground">Carregando…</div>
              ) : logs.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/30 p-8 text-center text-sm text-muted-foreground">
                  Nenhum evento registrado ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const a = parseAction(log.action);
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-xl border border-border bg-background/30 p-4"
                      >
                        {getEventIcon(a.type)}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">
                            {log.team_id ? (
                              <>
                                {log.team_name} <span className="text-muted-foreground">[{log.team_tag}]</span>
                              </>
                            ) : (
                              <>Treino</>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {getEventLabel(a.type, a.summary)} • {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="border-t border-border p-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={fetchLogs} disabled={loading}>
                Atualizar
              </Button>
              <Button type="button" className="bg-gradient-primary" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
