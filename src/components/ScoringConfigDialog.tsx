import { useState, useEffect } from "react";
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
import { Award, Plus, Trash2, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PositionPoint {
  position: number;
  points: number;
}

interface ScoringConfigDialogProps {
  trainingId: string;
  currentPointsPerKill: number;
  currentPointsPerPosition: any[];
  onConfigUpdated: () => void;
}

export function ScoringConfigDialog({
  trainingId,
  currentPointsPerKill,
  currentPointsPerPosition,
  onConfigUpdated,
}: ScoringConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [pointsPerKill, setPointsPerKill] = useState(currentPointsPerKill);
  const [positionPoints, setPositionPoints] = useState<PositionPoint[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPointsPerKill(currentPointsPerKill);
      // Parse current points per position
      if (currentPointsPerPosition && Array.isArray(currentPointsPerPosition)) {
        setPositionPoints(currentPointsPerPosition);
      } else {
        // Default positions 1-6
        setPositionPoints([
          { position: 1, points: 10 },
          { position: 2, points: 8 },
          { position: 3, points: 6 },
          { position: 4, points: 5 },
          { position: 5, points: 4 },
          { position: 6, points: 3 },
        ]);
      }
    }
  }, [open, currentPointsPerKill, currentPointsPerPosition]);

  const handleAddPosition = () => {
    const nextPosition = positionPoints.length > 0
      ? Math.max(...positionPoints.map(p => p.position)) + 1
      : 1;
    setPositionPoints([...positionPoints, { position: nextPosition, points: 1 }]);
  };

  const handleRemovePosition = (index: number) => {
    setPositionPoints(positionPoints.filter((_, i) => i !== index));
  };

  const handlePositionChange = (index: number, field: keyof PositionPoint, value: number) => {
    const updated = [...positionPoints];
    updated[index][field] = value;
    setPositionPoints(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Sort positions and generate text
      const sortedPositions = [...positionPoints].sort((a, b) => a.position - b.position);
      const pointsText = sortedPositions
        .map(p => `${p.position}º lugar: ${p.points} pontos`)
        .join("\n");

      const { error } = await supabase
        .from("trainings")
        .update({
          points_per_kill: pointsPerKill,
          points_per_position: sortedPositions as unknown as any,
          points_per_position_text: pointsText,
        })
        .eq("id", trainingId);

      if (error) throw error;

      toast.success("Sistema de pontuação atualizado!");
      onConfigUpdated();
      setOpen(false);
    } catch (error) {
      console.error("Error saving scoring config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex-1 gap-2">
          <Award className="w-4 h-4" />
          Pontuação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Sistema de Pontuação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Points per Kill */}
          <div>
            <Label htmlFor="pointsPerKill">Pontos por Abate</Label>
            <Input
              id="pointsPerKill"
              type="number"
              min="0"
              value={pointsPerKill}
              onChange={(e) => setPointsPerKill(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>

          {/* Points per Position */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pontos por Posição</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPosition}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar Posição
              </Button>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
              {positionPoints.map((pp, index) => (
                <div
                  key={index}
                  className="flex items-end gap-3 p-3 rounded-lg bg-background/50 border border-border"
                >
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Posição</Label>
                    <Input
                      type="number"
                      min="1"
                      value={pp.position}
                      onChange={(e) =>
                        handlePositionChange(index, "position", parseInt(e.target.value) || 1)
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Pontos</Label>
                    <Input
                      type="number"
                      min="0"
                      value={pp.points}
                      onChange={(e) =>
                        handlePositionChange(index, "points", parseInt(e.target.value) || 0)
                      }
                      className="h-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePosition(index)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {positionPoints.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Nenhuma posição configurada. Clique em "Adicionar Posição" para começar.
                </p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              "Salvar Configuração"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
