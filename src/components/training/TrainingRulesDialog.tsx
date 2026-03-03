import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { ActionTile } from "@/components/ActionTile";

interface TrainingRulesDialogProps {
  trainingId: string;
  currentRules?: string | null;
  primaryColor: string;
  onSaved?: () => void;
  triggerVariant?: "button" | "tile";
}

export function TrainingRulesDialog({
  trainingId,
  currentRules,
  primaryColor,
  onSaved,
  triggerVariant = "button",
}: TrainingRulesDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState(currentRules ?? "");

  useEffect(() => {
    if (!open) return;
    setRules(currentRules ?? "");
  }, [open, currentRules]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const next = rules.trim();
      const { error } = await supabase
        .from("trainings")
        .update({ rules: next ? next : null })
        .eq("id", trainingId);

      if (error) throw error;
      toast.success("Regras atualizadas!");
      setOpen(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar regras");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "tile" ? (
          <ActionTile
            title="Regras do treino"
            description="Escreva regras, detalhes e distribuição da premiação."
            icon={BookOpen}
          />
        ) : (
          <Button variant="outline" size="sm" className="w-full justify-center gap-2">
            <BookOpen className="w-4 h-4" />
            Regras do Treino
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Regras do Treino</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="trainingRules">Escreva as regras</Label>
          <Textarea
            id="trainingRules"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Ex: Proibido duplicar jogador, tempo de check-in, punições..."
            className="min-h-[220px]"
          />
          <p className="text-xs text-muted-foreground">
            Dica: você pode colar texto do WhatsApp/Discord aqui.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
