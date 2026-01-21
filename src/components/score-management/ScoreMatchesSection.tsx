import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Match } from "./types";

interface Props {
  canCreateMatch: boolean;
  newMatchName: string;
  newMatchMap: string;
  onNewMatchNameChange: (v: string) => void;
  onNewMatchMapChange: (v: string) => void;
  onCreateMatch: () => void;

  matches: Match[];
  selectedMatchId: string;
  onSelectMatch: (id: string) => void;
  onDeleteMatch: (id: string) => void;
}

export function ScoreMatchesSection({
  canCreateMatch,
  newMatchName,
  newMatchMap,
  onNewMatchNameChange,
  onNewMatchMapChange,
  onCreateMatch,
  matches,
  selectedMatchId,
  onSelectMatch,
  onDeleteMatch,
}: Props) {
  return (
    <section>
      <h3 className="font-semibold mb-3">Quedas</h3>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input
          placeholder="Nome da queda (ex: 1ª Queda)"
          value={newMatchName}
          onChange={(e) => onNewMatchNameChange(e.target.value)}
          className="flex-1"
          disabled={!canCreateMatch}
        />
        <Input
          placeholder="Mapa (opcional)"
          value={newMatchMap}
          onChange={(e) => onNewMatchMapChange(e.target.value)}
          className="w-full sm:w-32"
          disabled={!canCreateMatch}
        />
        <Button
          onClick={onCreateMatch}
          size="sm"
          className="sm:w-auto"
          disabled={!canCreateMatch}
          type="button"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma queda nesta rodada ainda — crie uma acima.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {matches.map((match) => (
            <Badge
              key={match.id}
              variant={selectedMatchId === match.id ? "default" : "secondary"}
              className="cursor-pointer flex items-center gap-1"
              onClick={() => onSelectMatch(match.id)}
            >
              {match.name}
              {match.map_name && (
                <span className="text-xs opacity-70">({match.map_name})</span>
              )}
              {match.status === "completed" && <span className="text-xs">✓</span>}
              <Trash2
                className="w-3 h-3 ml-1 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMatch(match.id);
                }}
              />
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}
