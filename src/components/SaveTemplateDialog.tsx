import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { ActionTile } from "@/components/ActionTile";
import { toast } from "sonner";

interface Training {
  game: string;
  mode: string;
  platform: string;
  max_slots: number;
  rounds: number;
  points_per_kill: number;
  points_per_position: any;
  points_per_position_text?: string;
  rules?: string;
  prize?: string;
  important_info?: string;
  discord_link?: string;
}

interface SaveTemplateDialogProps {
  training: Training;
  organizerId: string;
  triggerVariant?: "button" | "tile";
}

export function SaveTemplateDialog({ training, organizerId, triggerVariant = "button" }: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("training_templates" as any).insert({
        organizer_id: organizerId,
        name: templateName,
        game: training.game,
        mode: training.mode,
        platform: training.platform,
        max_slots: training.max_slots,
        rounds: training.rounds,
        points_per_kill: training.points_per_kill,
        points_per_position: training.points_per_position,
        points_per_position_text: training.points_per_position_text,
        rules: training.rules,
        prize: training.prize,
        important_info: training.important_info,
        discord_link: training.discord_link,
      });

      if (error) throw error;

      toast.success("Template salvo com sucesso!");
      setOpen(false);
      setTemplateName("");
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Erro ao salvar template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "tile" ? (
          <ActionTile
            title="Salvar template"
            description="Guarde essas configurações para usar depois."
            icon={Save}
          />
        ) : (
          <Button variant="outline" size="sm" className="w-full justify-center gap-2">
            <Save className="w-4 h-4" />
            Salvar como Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="templateName">Nome do Template</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex: Treino Semanal Squad"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              O template salvará: jogo, modo, plataforma, vagas, rodadas, sistema de pontuação, regras, premiação e informações importantes.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-primary">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
