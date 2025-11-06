import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ReportTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingId: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  onReportSuccess?: () => void;
}

export const ReportTeamDialog = ({
  open,
  onOpenChange,
  trainingId,
  teamId,
  teamName,
  teamTag,
  onReportSuccess,
}: ReportTeamDialogProps) => {
  const [reason, setReason] = useState<string>("no_show");
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("team_reports")
        .insert({
          training_id: trainingId,
          team_id: teamId,
          team_tag: teamTag,
          organizer_id: user.id,
          reason: reason,
        });

      if (error) throw error;

      toast.success(`Equipe ${teamName} denunciada com sucesso!`);
      onOpenChange(false);
      onReportSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao denunciar equipe: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denunciar Equipe</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Atenção!</p>
              <p>
                Você está prestes a denunciar a equipe <strong>{teamName} [{teamTag}]</strong>.
                Após 3 denúncias, a equipe será automaticamente bloqueada dos seus treinos.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Motivo da denúncia:</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no_show" id="no_show" />
                <Label htmlFor="no_show" className="cursor-pointer">
                  Não compareceu ao treino
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cheating" id="cheating" />
                <Label htmlFor="cheating" className="cursor-pointer">
                  Uso de hack/trapaça
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rule_violation" id="rule_violation" />
                <Label htmlFor="rule_violation" className="cursor-pointer">
                  Violação de regras
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleReport}
              disabled={loading}
            >
              {loading ? "Denunciando..." : "Confirmar Denúncia"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
