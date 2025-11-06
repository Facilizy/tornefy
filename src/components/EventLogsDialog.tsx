import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, UserPlus, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EventLog {
  id: string;
  team_name: string;
  team_tag: string;
  action: string;
  created_at: string;
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
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
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
                  {log.action === "joined" ? (
                    <UserPlus className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <UserMinus className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">
                      {log.team_name} [{log.team_tag}]
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {log.action === "joined" ? "Inscreveu-se" : "Saiu"} •{" "}
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
