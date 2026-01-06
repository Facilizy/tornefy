import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface GamePreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentGames?: string[];
  onSave?: (games: string[]) => void;
}

const GAMES = [
  { id: "free_fire", name: "Free Fire", logo: "/game-logos/free-fire.png" },
  { id: "blood_strike", name: "Blood Strike", logo: "/game-logos/blood-strike.png" },
  { id: "farlight_84", name: "Farlight 84", logo: "/game-logos/farlight-84.png" },
  { id: "prime_rush", name: "Prime Rush", logo: "/game-logos/prime-rush.png" },
  { id: "battlefield_6", name: "Battlefield 6", logo: "/game-logos/battlefield-6.png" },
];

export const GamePreferencesDialog = ({
  open,
  onOpenChange,
  userId,
  currentGames = [],
  onSave,
}: GamePreferencesDialogProps) => {
  const [selectedGames, setSelectedGames] = useState<string[]>(currentGames);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedGames(currentGames);
  }, [currentGames]);

  const toggleGame = (gameId: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameId)
        ? prev.filter((g) => g !== gameId)
        : [...prev, gameId]
    );
  };

  const handleSave = async () => {
    if (selectedGames.length === 0) {
      toast.error("Selecione pelo menos um jogo");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_games: selectedGames })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Jogos preferidos salvos!");
      onSave?.(selectedGames);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar preferências");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Jogos Preferidos</DialogTitle>
          <DialogDescription>
            Selecione os jogos que você joga para receber recomendações de scrims personalizadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {GAMES.map((game) => {
            const selected = selectedGames.includes(game.id);
            return (
              <button
                key={game.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleGame(game.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={selected}
                  className="pointer-events-none"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <img
                  src={game.logo}
                  alt={game.name}
                  loading="lazy"
                  className="w-8 h-8 rounded object-cover"
                />
                <span className="flex-1 font-medium">{game.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GamePreferencesDialog;
