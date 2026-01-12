import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Palette, Loader2 } from "lucide-react";

interface TrainingColorEditorProps {
  trainingId: string;
  currentPrimaryColor: string;
  currentSecondaryColor: string;
  onColorsUpdated: () => void;
}

export function TrainingColorEditor({
  trainingId,
  currentPrimaryColor,
  currentSecondaryColor,
  onColorsUpdated,
}: TrainingColorEditorProps) {
  const [open, setOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(currentPrimaryColor || "#9146FF");
  const [secondaryColor, setSecondaryColor] = useState(currentSecondaryColor || "#1F2937");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("trainings")
        .update({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq("id", trainingId);

      if (error) throw error;

      toast.success("Cores atualizadas com sucesso!");
      onColorsUpdated();
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar cores");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          Cores do Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Personalizar Cores
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div
            className="h-24 rounded-xl overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg drop-shadow-lg">
                Preview do Banner
              </span>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 uppercase"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* Preset Colors */}
          <div className="space-y-2">
            <Label>Cores Rápidas</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { primary: "#9146FF", secondary: "#1F2937", name: "Roxo Tornefy" },
                { primary: "#FF4654", secondary: "#0F1923", name: "Vermelho" },
                { primary: "#00C8C8", secondary: "#1A1A2E", name: "Ciano" },
                { primary: "#FFD700", secondary: "#2D2D2D", name: "Dourado" },
                { primary: "#00FF7F", secondary: "#1A1A1A", name: "Verde" },
                { primary: "#FF6B35", secondary: "#2D132C", name: "Laranja" },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setPrimaryColor(preset.primary);
                    setSecondaryColor(preset.secondary);
                  }}
                  className="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 100%)`,
                  }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Palette className="w-4 h-4 mr-2" />
            )}
            Salvar Cores
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
