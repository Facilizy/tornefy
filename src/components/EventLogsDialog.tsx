import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, UserPlus, UserMinus, Trophy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EventLog {
  id: string;
  team_name: string;
  team_tag: string;
  action: string;
  created_at: string;
}

function parseAction(action: string): { type: string; raw: any } {
  try {
    const parsed = JSON.parse(action);
    if (parsed && typeof parsed.type === "string") return { type: parsed.type, raw: parsed };
  } catch {
    // ignore
  }
  return { type: action, raw: null };
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
            Event Logs
          </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Logs de Eventos - {trainingName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex justify-center py-8">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum evento registrado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {(() => {
                    const a = parseAction(log.action);
                    if (a.type === "joined") return <UserPlus className="w-5 h-5 text-primary flex-shrink-0" />;
                    if (a.type === "left") return <UserMinus className="w-5 h-5 text-destructive flex-shrink-0" />;
                    if (a.type === "score_saved") return <Trophy className="w-5 h-5 text-primary flex-shrink-0" />;
                    return <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />;
                  })()}
                  <div className="flex-1">
                    <p className="font-medium">
                      {log.team_name} [{log.team_tag}]
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const a = parseAction(log.action);
                        if (a.type === "joined") return "Inscreveu-se";
                        if (a.type === "left") return "Saiu";
                        if (a.type === "score_saved") return "Pontuação atualizada";
                        return "Evento";
                      })()} •{" "}
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
