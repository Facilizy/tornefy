import { Plus, Target, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Round } from "./types";

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
    <section>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Target className="w-4 h-4" />
        Rodadas
      </h3>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input
          placeholder="Nome da rodada (ex: 1ª Rodada)"
          value={newRoundName}
          onChange={(e) => onNewRoundNameChange(e.target.value)}
        />
        <Button onClick={onCreateRound} size="sm" className="sm:w-auto" type="button">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {rounds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Crie uma rodada para começar.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rounds.map((round) => (
            <Badge
              key={round.id}
              variant={selectedRoundId === round.id ? "default" : "secondary"}
              className="cursor-pointer flex items-center gap-1"
              onClick={() => onSelectRound(round.id)}
            >
              {round.name}
              <Trash2
                className="w-3 h-3 ml-1 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRound(round.id);
                }}
              />
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}
