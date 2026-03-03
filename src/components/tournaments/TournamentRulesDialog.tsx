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

interface TournamentRulesDialogProps {
  tournamentId: string;
  currentRules?: string | null;
  onSaved?: () => void;
}

export function TournamentRulesDialog({
  tournamentId,
  currentRules,
  onSaved,
}: TournamentRulesDialogProps) {
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
      const { error } = await (supabase as any)
        .from("tournaments")
        .update({ rules: next ? next : null })
        .eq("id", tournamentId);

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
        <Button variant="outline" size="sm" className="justify-center gap-2">
          <BookOpen className="w-4 h-4" />
          Regras do Torneio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Regras do Torneio</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="tournamentRules">Escreva as regras</Label>
          <Textarea
            id="tournamentRules"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Ex: formato dos grupos, critérios de desempate, punições..."
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
