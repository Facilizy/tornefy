import { Plus, Trash2, Map, CheckCircle2, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Match } from "./types";
import { cn } from "@/lib/utils";

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
  onDeleteMatch,
  onSelectMatch,
}: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Swords className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quedas / Partidas</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Nome da queda (ex: 1ª Queda)"
          value={newMatchName}
          onChange={(e) => onNewMatchNameChange(e.target.value)}
          className="flex-1 h-10 bg-muted/20 border-border/50"
          disabled={!canCreateMatch}
        />
        <div className="relative w-full sm:w-48">
          <Input
            placeholder="Mapa (opcional)"
            value={newMatchMap}
            onChange={(e) => onNewMatchMapChange(e.target.value)}
            className="h-10 pl-9 bg-muted/20 border-border/50"
            disabled={!canCreateMatch}
          />
          <Map className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
        </div>
        <Button
          onClick={onCreateMatch}
          size="default"
          className="h-10 px-4 bg-primary/90 hover:bg-primary transition-all font-bold"
          disabled={!canCreateMatch}
          type="button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Partida
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 min-h-[60px] p-4 bg-muted/10 rounded-xl border border-border/40">
        {matches.length === 0 ? (
          <div className="col-span-full py-2 text-center">
            <p className="text-xs text-muted-foreground italic">Nenhuma queda nesta rodada ainda.</p>
          </div>
        ) : (
          matches.map((match) => (
            <div
              key={match.id}
              onClick={() => onSelectMatch(match.id)}
              className={cn(
                "group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer text-center",
                selectedMatchId === match.id
                  ? "bg-primary text-black border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20"
                  : "bg-background/50 border-border/40 text-muted-foreground hover:border-primary/30 hover:bg-muted/10"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm font-bold truncate max-w-[80px]">{match.name}</span>
                {match.status === "completed" && <CheckCircle2 className={cn("w-3 h-3", selectedMatchId === match.id ? "text-black/60" : "text-green-500")} />}
              </div>

              {match.map_name && (
                <span className={cn(
                  "text-[10px] uppercase font-bold tracking-tight opacity-60",
                  selectedMatchId === match.id ? "text-black/70" : "text-muted-foreground"
                )}>
                  {match.map_name}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMatch(match.id);
                }}
                className={cn(
                  "absolute -top-2 -right-2 p-1.5 rounded-full border bg-background shadow-sm opacity-0 group-hover:opacity-100 transition-opacity",
                  selectedMatchId === match.id
                    ? "hover:bg-muted text-destructive ring-1 ring-primary"
                    : "hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive"
                )}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

