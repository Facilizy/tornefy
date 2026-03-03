import { Plus, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Round } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  rounds: Round[];
  selectedRoundId: string;
  newRoundName: string;
  onNewRoundNameChange: (v: string) => void;
  onCreateRound: () => void;
  onSelectRound: (id: string) => void;
  onDeleteRound: (id: string) => void;
}

export function ScoreRoundsSection({
  rounds,
  selectedRoundId,
  newRoundName,
  onNewRoundNameChange,
  onCreateRound,
  onSelectRound,
  onDeleteRound,
}: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Etapa / Rodadas</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Nome da rodada (ex: 1ª Rodada)"
            value={newRoundName}
            onChange={(e) => onNewRoundNameChange(e.target.value)}
            className="h-10 bg-muted/20 border-border/50 focus:bg-background transition-all"
          />
        </div>
        <Button onClick={onCreateRound} size="default" className="h-10 px-4 bg-primary hover:bg-primary/90 transition-all font-bold" type="button">
          <Plus className="w-4 h-4 mr-2" />
          Nova Rodada
        </Button>
      </div>

      <div className="flex flex-wrap gap-2.5 min-h-[40px] p-4 bg-muted/10 rounded-xl border border-border/40">
        {rounds.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-1">
            Nenhuma rodada configurada. Crie uma acima para começar.
          </p>
        ) : (
          rounds.map((round) => (
            <div
              key={round.id}
              onClick={() => onSelectRound(round.id)}
              className={cn(
                "group relative flex items-center gap-2 pl-4 pr-2 py-2 rounded-lg border transition-all cursor-pointer select-none",
                selectedRoundId === round.id
                  ? "bg-primary text-black border-primary shadow-md shadow-primary/20 font-bold"
                  : "bg-background/50 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <span className="text-sm">{round.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRound(round.id);
                }}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  selectedRoundId === round.id
                    ? "hover:bg-black/10 text-black/60"
                    : "hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive"
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {selectedRoundId === round.id && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black/40" />
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

