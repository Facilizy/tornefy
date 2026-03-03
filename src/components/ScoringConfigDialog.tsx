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
import { ActionTile } from "@/components/ActionTile";
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
  triggerVariant?: "button" | "tile";
}

export function ScoringConfigDialog({
  trainingId,
  currentPointsPerKill,
  currentPointsPerPosition,
  onConfigUpdated,
  triggerVariant = "button",
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
        {triggerVariant === "tile" ? (
          <ActionTile
            title="Configurar Pontuação"
            description="Defina pontos por abate e por colocação."
            icon={Settings}
          />
        ) : (
          <Button size="xs" variant="outline" className="w-full justify-center gap-2">
            <Award className="w-4 h-4" />
            Editar Pontuação
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-0">
        <div className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                <Settings className="h-5 w-5" />
                Sistema de Pontuação
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Defina o valor por abate e a tabela de pontos por colocação.
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Abates</h3>
                  <div className="ml-3 flex-1 border-b border-border" />
                </div>

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
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">Posições</h3>
                    <div className="ml-3 flex-1 border-b border-border" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPosition}
                    className="gap-2 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-3">
                  {positionPoints.map((pp, index) => (
                    <div
                      key={`${pp.position}-${index}`}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-4 sm:flex-row sm:items-end"
                    >
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Posição</Label>
                        <Input
                          type="number"
                          min="1"
                          value={pp.position}
                          onChange={(e) => handlePositionChange(index, "position", parseInt(e.target.value) || 1)}
                          className="mt-1 h-9"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Pontos</Label>
                        <Input
                          type="number"
                          min="0"
                          value={pp.points}
                          onChange={(e) => handlePositionChange(index, "points", parseInt(e.target.value) || 0)}
                          className="mt-1 h-9"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePosition(index)}
                        className="h-9 gap-2 sm:mb-[2px]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  ))}

                  {positionPoints.length === 0 && (
                    <div className="rounded-xl border border-border bg-background/30 p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma posição configurada. Clique em “Adicionar” para começar.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="border-t border-border p-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Configuração"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}