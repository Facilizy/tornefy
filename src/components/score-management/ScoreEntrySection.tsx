import { Loader2, Save, Trash2, Crown } from "lucide-react";
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

interface Props {
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
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Lançamento</h3>
        </div>

        <Select onValueChange={addTeamScore}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="+ Adicionar Equipe" />
          </SelectTrigger>
          <SelectContent>
            {availableTeams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-2">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt={`Logo ${t.name}`}
                      className="w-5 h-5 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-bold">
                        {(t.tag || t.name || "??").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="truncate">
                    {t.name} [{t.tag}]
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {scores
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((score) => {
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
              <Card key={score.team_id} className="p-4">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 sm:col-span-4 flex items-center gap-2 min-w-0">
                    {score.position <= 3 && (
                      <Badge
                        variant={score.position === 1 ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {score.position === 1 ? "1º" : score.position === 2 ? "2º" : "3º"}
                      </Badge>
                    )}

                    {team?.logo_url && (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-8 h-8 rounded-full object-cover"
                        loading="lazy"
                      />
                    )}

                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{team?.name}</p>
                      <p className="text-xs text-muted-foreground">[{team?.tag}]</p>
                    </div>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs">Posição</Label>
                    <Select
                      value={String(score.position)}
                      onValueChange={(v) => updateTeamPosition(score.team_id, Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePositions.map((pos) => (
                          <SelectItem
                            key={pos}
                            value={String(pos)}
                            disabled={scores.some((s) => s.position === pos && s.team_id !== score.team_id)}
                          >
                            {pos}º
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs">Kills (players)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={isAutoSummingKills ? playersTotalKills : score.kills}
                      onChange={(e) => updateTeamKills(score.team_id, parseInt(e.target.value) || 0)}
                      disabled={isAutoSummingKills}
                      className="w-full"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs">Kills extras</Label>
                    <Input
                      type="number"
                      min="0"
                      value={extraKills}
                      onChange={(e) => updateTeamExtraKills(score.team_id, parseInt(e.target.value) || 0)}
                      className="w-full"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs">Extra</Label>
                    <Input
                      type="number"
                      value={score.bonus_points}
                      onChange={(e) => updateTeamBonusPoints(score.team_id, parseInt(e.target.value) || 0)}
                      className="w-full"
                      placeholder="±"
                    />
                  </div>

                  <div className="col-span-10 sm:col-span-1 flex sm:block items-center justify-between gap-3 text-sm">
                    <div className="whitespace-nowrap">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-1 font-bold text-primary">{pts.total}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTeam(score.team_id)}
                    className="col-span-2 sm:col-span-1 justify-self-end"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Players (kills)</p>
                      {isAutoSummingKills && (
                        <p className="text-[11px] leading-tight text-muted-foreground">
                          Kills totais = kills dos players + kills extras
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Total: {totalKills}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onReloadTeamPlayers(score.team_id)}
                      >
                        Recarregar
                      </Button>
                    </div>
                  </div>

                  {players.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum player encontrado para a line inscrita neste treino.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {players.map((p, idx) => (
                        <div
                          key={`${score.team_id}:${p.team_member_id ?? p.line_id ?? p.player_name}:${idx}`}
                          className="flex items-center gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate">{p.player_name}</p>
                          </div>

                          <Button
                            type="button"
                            variant={p.is_mvp ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9"
                            title={p.user_id ? "Marcar MVP" : "MVP só para jogadores com conta"}
                            disabled={!p.user_id}
                            onClick={() => onToggleMvp(score.team_id, p.client_id)}
                          >
                            <Crown className="w-4 h-4" />
                          </Button>

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
                            className="w-20"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

        {scores.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Adicione equipes para registrar os resultados
          </p>
        )}
      </div>

      {scores.length > 0 && (
        <Button onClick={onSave} disabled={saving} className="w-full mt-4 gap-2" type="button">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Pontuação
        </Button>
      )}
    </section>
  );
}
