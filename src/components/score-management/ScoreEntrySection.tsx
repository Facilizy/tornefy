import { Loader2, Save, Trash2, Crown, Plus, RotateCcw, Users, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MatchScore, PlayerStat, Team } from "./types";
import { ProcessScoreboardDialog } from "./ProcessScoreboardDialog";
import { cn } from "@/lib/utils";

interface Props {
  trainingId: string;
  teams: Team[];
  selectedMatchId: string;
  pointsPerKill: number;
  positionPointsMap: Record<number, number>;

  scores: MatchScore[];
  onScoresChange: (next: MatchScore[]) => void;
  onRemoveTeam: (teamId: string) => void;

  playerStatsByTeam: Record<string, PlayerStat[]>;
  onReloadTeamPlayers: (teamId: string) => void;
  onUpdatePlayerKills: (teamId: string, playerClientId: string, kills: number) => void;
  onToggleMvp: (teamId: string, playerClientId: string) => void;

  saving: boolean;
  onSave: () => void;

  autoScoreEnabled?: boolean;
  onScoreboardProcessed?: () => void;
}

function calculatePoints(
  position: number,
  kills: number,
  bonusPoints: number,
  pointsPerKill: number,
  positionPointsMap: Record<number, number>
) {
  const posPoints = positionPointsMap[position] || 0;
  const killPoints = kills * pointsPerKill;
  return {
    posPoints,
    killPoints,
    bonusPoints,
    total: posPoints + killPoints + bonusPoints,
  };
}

export function ScoreEntrySection({
  trainingId,
  teams,
  selectedMatchId,
  pointsPerKill,
  positionPointsMap,
  scores,
  onScoresChange,
  onRemoveTeam,
  playerStatsByTeam,
  onReloadTeamPlayers,
  onUpdatePlayerKills,
  onToggleMvp,
  saving,
  onSave,
  autoScoreEnabled = false,
  onScoreboardProcessed,
}: Props) {
  if (!selectedMatchId) return null;

  const availableTeams = teams.filter((t) => !scores.some((s) => s.team_id === t.id));
  const availablePositions = Array.from({ length: Math.max(teams.length, 1) }, (_, i) => i + 1);

  const addTeamScore = (teamId: string) => {
    if (scores.some((s) => s.team_id === teamId)) return;
    const used = new Set(scores.map((s) => s.position));
    let pos = 1;
    while (used.has(pos)) pos++;
    onScoresChange([...scores, { team_id: teamId, position: pos, kills: 0, extra_kills: 0, bonus_points: 0 }]);
    onReloadTeamPlayers(teamId);
  };

  const updateTeamBonusPoints = (teamId: string, bonus: number) => {
    onScoresChange(scores.map((s) => (s.team_id === teamId ? { ...s, bonus_points: bonus } : s)));
  };

  const updateTeamPosition = (teamId: string, newPosition: number) => {
    const conflict = scores.find((s) => s.position === newPosition && s.team_id !== teamId);
    if (conflict) return;
    onScoresChange(scores.map((s) => (s.team_id === teamId ? { ...s, position: newPosition } : s)));
  };

  const updateTeamKills = (teamId: string, kills: number) => {
    onScoresChange(scores.map((s) => (s.team_id === teamId ? { ...s, kills } : s)));
  };

  const updateTeamExtraKills = (teamId: string, extraKills: number) => {
    onScoresChange(
      scores.map((s) => {
        if (s.team_id !== teamId) return s;
        const players = playerStatsByTeam[teamId] || [];
        const playersTotal = players.reduce((sum, p) => sum + (Number(p.kills) || 0), 0);
        const extra = Math.max(0, Number(extraKills) || 0);
        return {
          ...s,
          extra_kills: extra,
          kills: playersTotal + extra,
        };
      })
    );
  };

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="font-bold text-lg tracking-tight">Registro de Resultados</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {autoScoreEnabled && (
            <ProcessScoreboardDialog
              trainingId={trainingId}
              matchId={selectedMatchId}
              onApplied={onScoreboardProcessed}
            />
          )}

          <Select onValueChange={addTeamScore}>
            <SelectTrigger className="w-full sm:w-64 bg-background/50 hover:bg-background transition-colors border-primary/20 hover:border-primary/40">
              <Plus className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Adicionar Equipe" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {availableTeams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2 py-1">
                    {t.logo_url ? (
                      <img
                        src={t.logo_url}
                        alt={`Logo ${t.name}`}
                        className="w-6 h-6 rounded-md object-cover ring-1 ring-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center ring-1 ring-border">
                        <span className="text-[10px] font-bold">
                          {(t.tag || t.name || "??").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-sm leading-none">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">[{t.tag}]</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {scores
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((score, idx) => {
            const team = teams.find((t) => t.id === score.team_id);
            const players = playerStatsByTeam[score.team_id] || [];
            const playersTotalKills = players.reduce((sum, p) => sum + (p.kills || 0), 0);
            const extraKills = Number(score.extra_kills ?? 0) || 0;
            const totalKills = playersTotalKills + extraKills;
            const isAutoSummingKills = players.length > 0;
            const pts = calculatePoints(
              score.position,
              isAutoSummingKills ? totalKills : score.kills,
              score.bonus_points,
              pointsPerKill,
              positionPointsMap
            );

            return (
              <Card
                key={score.team_id}
                className={cn(
                  "overflow-hidden transition-all duration-300 border-border/50",
                  score.position === 1 ? "bg-primary/[0.03] ring-1 ring-primary/20" : "bg-card/50"
                )}
              >
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Team Info Side */}
                    <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                      <div className="relative">
                        <div className={cn(
                          "w-12 h-12 rounded-xl border flex items-center justify-center ring-offset-2 overflow-hidden bg-background shadow-sm",
                          score.position === 1 ? "ring-2 ring-primary border-primary/20" : "border-border/50"
                        )}>
                          {team?.logo_url ? (
                            <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-lg text-muted-foreground">{team?.tag?.slice(0, 2)}</span>
                          )}
                        </div>
                        {score.position <= 12 && (
                          <div className={cn(
                            "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border shadow-md",
                            score.position === 1 ? "bg-[#FFD700] text-black border-[#DAA520]" :
                              score.position === 2 ? "bg-[#C0C0C0] text-black border-[#A9A9A9]" :
                                score.position === 3 ? "bg-[#CD7F32] text-white border-[#8B4513]" :
                                  "bg-muted text-muted-foreground border-border"
                          )}>
                            {score.position}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base truncate">{team?.name}</h4>
                          {score.position === 1 && <Crown className="w-4 h-4 text-[#FFD700]" />}
                        </div>
                        <p className="text-xs text-muted-foreground tracking-widest font-mono uppercase opacity-80">{team?.tag}</p>
                      </div>
                    </div>

                    {/* Numeric Inputs Grid */}
                    <div className="col-span-12 md:col-span-8">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Posição</Label>
                          <Select
                            value={String(score.position)}
                            onValueChange={(v) => updateTeamPosition(score.team_id, Number(v))}
                          >
                            <SelectTrigger className="h-9 bg-background/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePositions.map((pos) => (
                                <SelectItem
                                  key={pos}
                                  value={String(pos)}
                                  disabled={scores.some((s) => s.position === pos && s.team_id !== score.team_id)}
                                >
                                  {pos}º Colocado
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Kills Totais</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              value={isAutoSummingKills ? totalKills : score.kills}
                              onChange={(e) => updateTeamKills(score.team_id, parseInt(e.target.value) || 0)}
                              disabled={isAutoSummingKills}
                              className={cn(
                                "h-9 pl-3 pr-8 bg-background/40",
                                isAutoSummingKills && "opacity-80 font-bold border-primary/20"
                              )}
                            />
                            {isAutoSummingKills && (
                              <Users className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50" />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Kills Extras</Label>
                          <Input
                            type="number"
                            min="0"
                            value={extraKills}
                            onChange={(e) => updateTeamExtraKills(score.team_id, parseInt(e.target.value) || 0)}
                            className="h-9 bg-background/40"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground/70">Bônus/Penal.</Label>
                          <Input
                            type="number"
                            value={score.bonus_points}
                            onChange={(e) => updateTeamBonusPoints(score.team_id, parseInt(e.target.value) || 0)}
                            className="h-9 bg-background/40 font-mono"
                            placeholder="±"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Players Drawer */}
                  <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border/40">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/40 border border-border/50">
                        <span className="text-muted-foreground">Posição:</span>
                        <span className="font-bold">{pts.posPoints} pts</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/40 border border-border/50">
                        <span className="text-muted-foreground">Kills:</span>
                        <span className="font-bold">{pts.killPoints} pts</span>
                      </div>
                      {pts.bonusPoints !== 0 && (
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/50",
                          pts.bonusPoints > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          <span className="opacity-80">Bônus:</span>
                          <span className="font-bold">{pts.bonusPoints > 0 ? '+' : ''}{pts.bonusPoints} pts</span>
                        </div>
                      )}
                      <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">TOTAL:</span>
                        <span className="text-lg font-black text-primary drop-shadow-sm">{pts.total}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveTeam(score.team_id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Remover
                      </Button>
                    </div>
                  </div>

                  {/* Players Grid */}
                  <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/40">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Jogadores individuais</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onReloadTeamPlayers(score.team_id)}
                        className="h-7 text-[10px] font-bold uppercase hover:bg-muted"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Sincronizar
                      </Button>
                    </div>

                    {players.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-xs text-muted-foreground italic">Nenhum player vinculado à line</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {players.map((p, idx) => (
                          <div
                            key={`${score.team_id}:${p.team_member_id ?? p.line_id ?? p.player_name}:${idx}`}
                            className="flex items-center gap-2 p-2 rounded-md bg-background/50 border border-border/30 hover:border-primary/30 transition-all group"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{p.player_name}</p>
                            </div>

                            <button
                              type="button"
                              title={p.user_id ? "MVP" : "Indisponível (sem conta)"}
                              disabled={!p.user_id}
                              onClick={() => onToggleMvp(score.team_id, p.client_id)}
                              className={cn(
                                "flex items-center justify-center h-8 w-8 rounded-md transition-all",
                                p.is_mvp
                                  ? "bg-[#FFD700] text-black shadow-inner"
                                  : "bg-muted text-muted-foreground/40 hover:text-[#FFD700] hover:bg-muted/80",
                                !p.user_id && "opacity-20 cursor-not-allowed"
                              )}
                            >
                              <Crown className={cn("w-4 h-4", p.is_mvp ? "fill-current" : "")} />
                            </button>

                            <Input
                              type="number"
                              min="0"
                              value={p.kills}
                              onChange={(e) =>
                                onUpdatePlayerKills(
                                  score.team_id,
                                  p.client_id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-8 w-14 px-2 text-xs text-center bg-transparent border-transparent group-hover:border-border/50 focus:border-primary/50 font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

        {scores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/10 rounded-2xl border-2 border-dashed border-border/50">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Swords className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-muted-foreground">Nenhuma equipe selecionada</p>
            <p className="text-sm text-muted-foreground/60 max-w-[240px] text-center mt-1">
              Adicione as equipes que participaram desta queda para começar.
            </p>
          </div>
        )}
      </div>

      {scores.length > 0 && (
        <div className="sticky bottom-0 bg-background/80 backdrop-blur-md p-4 mt-8 border-t border-border shadow-[0_-10px_20px_rgba(0,0,0,0.1)] rounded-b-xl z-20">
          <Button
            onClick={onSave}
            disabled={saving}
            className="w-full h-12 gap-2 text-base font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            type="button"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Pontuação da Queda
          </Button>
        </div>
      )}
    </section>
  );
}

