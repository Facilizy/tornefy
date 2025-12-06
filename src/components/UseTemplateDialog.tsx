import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
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
  created_at: string;
}

interface UseTemplateDialogProps {
  organizerId: string;
  onSelectTemplate: (template: Template) => void;
}

export function UseTemplateDialog({ organizerId, onSelectTemplate }: UseTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, organizerId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_templates" as any)
        .select("*")
        .eq("organizer_id", organizerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data as unknown as Template[]) || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template);
    setOpen(false);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Deseja realmente excluir este template?")) return;

    try {
      setDeletingId(templateId);
      const { error } = await supabase
        .from("training_templates" as any)
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Template excluído!");
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Erro ao excluir template");
    } finally {
      setDeletingId(null);
    }
  };

  const getGameLabel = (game: string) => {
    const games: Record<string, string> = {
      free_fire: "Free Fire",
      blood_strike: "Blood Strike",
      farlight_84: "Farlight 84",
    };
    return games[game] || game;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Usar Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Template</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum template salvo</p>
            <p className="text-sm mt-1">
              Crie um treino e salve como template para reutilizar
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors group"
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{template.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {getGameLabel(template.game)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.mode}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.platform}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.max_slots} vagas
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={(e) => handleDeleteTemplate(template.id, e)}
                    disabled={deletingId === template.id}
                  >
                    {deletingId === template.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Check className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
