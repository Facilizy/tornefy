import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Trophy, Target, Trash2, Save, Loader2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
}

interface Round {
  id: string;
  name: string;
  round_number: number;
}

interface Match {
  id: string;
  name: string;
  match_number: number;
  map_name?: string;
  status: string;
}

interface MatchScore {
  team_id: string;
  position: number;
  kills: number;
}

interface PositionPoint {
  position: number;
  points: number;
}

interface ScoreManagementDialogProps {
  trainingId: string;
  teams: Team[];
  pointsPerKill: number;
  pointsPerPosition: PositionPoint[];
  onScoresUpdated: () => void;
}

export function ScoreManagementDialog({
  trainingId,
  teams,
  pointsPerKill,
  pointsPerPosition,
  onScoresUpdated,
}: ScoreManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New round/match form
  const [newRoundName, setNewRoundName] = useState("");
  const [newMatchName, setNewMatchName] = useState("");
  const [newMatchMap, setNewMatchMap] = useState("");

  // Convert array to record for easy lookup
  const positionPointsMap: Record<number, number> = {};
  if (Array.isArray(pointsPerPosition)) {
    pointsPerPosition.forEach((pp: PositionPoint) => {
      positionPointsMap[pp.position] = pp.points;
    });
  }

  useEffect(() => {
    if (open) {
      fetchRounds();
    }
  }, [open, trainingId]);

  useEffect(() => {
    if (selectedRound) {
      fetchMatches(selectedRound);
    }
  }, [selectedRound]);

  useEffect(() => {
    if (selectedMatch) {
      fetchScores(selectedMatch);
    }
  }, [selectedMatch]);


  const fetchRounds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_rounds")
      .select("*")
      .eq("training_id", trainingId)
      .order("round_number");

    if (!error && data) {
      setRounds(data);
      if (data.length > 0 && !selectedRound) {
        setSelectedRound(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchMatches = async (roundId: string) => {
    const { data, error } = await supabase
      .from("training_matches")
      .select("*")
      .eq("round_id", roundId)
      .order("match_number");

    if (!error && data) {
      setMatches(data);
      if (data.length > 0) {
        setSelectedMatch(data[0].id);
      } else {
        setSelectedMatch("");
        setScores([]);
      }
    }
  };

  const fetchScores = async (matchId: string) => {
    const { data, error } = await supabase
      .from("training_match_scores")
      .select("*")
      .eq("match_id", matchId);

    if (!error && data) {
      setScores(data.map(s => ({
        team_id: s.team_id,
        position: s.position,
        kills: s.kills,
      })));
    } else {
      setScores([]);
    }
  };

  const createRound = async () => {
    if (!newRoundName.trim()) {
      toast.error("Digite o nome da rodada");
      return;
    }

    const { data, error } = await supabase
      .from("training_rounds")
      .insert({
        training_id: trainingId,
        name: newRoundName,
        round_number: rounds.length + 1,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar rodada");
      return;
    }

    toast.success("Rodada criada!");
    setNewRoundName("");
    fetchRounds();
    if (data) setSelectedRound(data.id);
  };

  const createMatch = async () => {
    if (!selectedRound) {
      toast.error("Selecione uma rodada primeiro");
      return;
    }
    if (!newMatchName.trim()) {
      toast.error("Digite o nome da queda");
      return;
    }

    const { data, error } = await supabase
      .from("training_matches")
      .insert({
        round_id: selectedRound,
        training_id: trainingId,
        name: newMatchName,
        match_number: matches.length + 1,
        map_name: newMatchMap || null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar queda");
      return;
    }

    toast.success("Queda criada!");
    setNewMatchName("");
    setNewMatchMap("");
    fetchMatches(selectedRound);
    if (data) setSelectedMatch(data.id);
  };

  const deleteRound = async (roundId: string) => {
    const { error } = await supabase
      .from("training_rounds")
      .delete()
      .eq("id", roundId);

    if (error) {
      toast.error("Erro ao excluir rodada");
      return;
    }

    toast.success("Rodada excluída!");
    setSelectedRound("");
    setSelectedMatch("");
    fetchRounds();
  };

  const deleteMatch = async (matchId: string) => {
    const { error } = await supabase
      .from("training_matches")
      .delete()
      .eq("id", matchId);

    if (error) {
      toast.error("Erro ao excluir queda");
      return;
    }

    toast.success("Queda excluída!");
    setSelectedMatch("");
    fetchMatches(selectedRound);
  };

  const addTeamScore = (teamId: string) => {
    if (scores.find(s => s.team_id === teamId)) {
      toast.error("Equipe já adicionada nesta queda");
      return;
    }

    // Find next available position
    const usedPositions = scores.map(s => s.position);
    let nextPosition = 1;
    while (usedPositions.includes(nextPosition)) {
      nextPosition++;
    }

    setScores([...scores, { team_id: teamId, position: nextPosition, kills: 0 }]);
  };

  const updateTeamPosition = (teamId: string, newPosition: number) => {
    // Check if position is already used by another team
    const existingTeam = scores.find(s => s.position === newPosition && s.team_id !== teamId);
    if (existingTeam) {
      toast.error("Esta posição já está ocupada por outra equipe");
      return;
    }

    setScores(scores.map(s => 
      s.team_id === teamId ? { ...s, position: newPosition } : s
    ));
  };

  const updateTeamKills = (teamId: string, kills: number) => {
    setScores(scores.map(s => 
      s.team_id === teamId ? { ...s, kills } : s
    ));
  };

  const removeTeamScore = (teamId: string) => {
    setScores(scores.filter(s => s.team_id !== teamId));
  };

  const calculatePoints = (position: number, kills: number) => {
    const posPoints = positionPointsMap[position] || 0;
    const killPoints = kills * pointsPerKill;
    return { posPoints, killPoints, total: posPoints + killPoints };
  };

  const saveScores = async () => {
    if (!selectedMatch) {
      toast.error("Selecione uma queda");
      return;
    }

    setSaving(true);

    try {
      // Delete existing scores for this match
      await supabase
        .from("training_match_scores")
        .delete()
        .eq("match_id", selectedMatch);

      // Insert new scores
      const scoresToInsert = scores.map(s => {
        const pts = calculatePoints(s.position, s.kills);
        return {
          match_id: selectedMatch,
          team_id: s.team_id,
          position: s.position,
          kills: s.kills,
          position_points: pts.posPoints,
          kill_points: pts.killPoints,
          total_points: pts.total,
        };
      });

      if (scoresToInsert.length > 0) {
        const { error } = await supabase
          .from("training_match_scores")
          .insert(scoresToInsert);

        if (error) throw error;
      }

      // Update match status
      await supabase
        .from("training_matches")
        .update({ status: "completed" })
        .eq("id", selectedMatch);

      toast.success("Pontuação salva com sucesso!");
      onScoresUpdated();
    } catch (error) {
      toast.error("Erro ao salvar pontuação");
    } finally {
      setSaving(false);
    }
  };

  const availableTeams = teams.filter(t => !scores.find(s => s.team_id === t.id));
  const availablePositions = Array.from({ length: teams.length }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Trophy className="w-4 h-4" />
          Gerenciar Pontuação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Sistema de Pontuação
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Rounds Section */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Rodadas
              </h3>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Nome da rodada (ex: 1ª Rodada)"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                />
                <Button onClick={createRound} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {rounds.map((round) => (
                  <Badge
                    key={round.id}
                    variant={selectedRound === round.id ? "default" : "secondary"}
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => setSelectedRound(round.id)}
                  >
                    {round.name}
                    <Trash2
                      className="w-3 h-3 ml-1 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRound(round.id);
                      }}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Matches Section */}
            {selectedRound && (
              <div>
                <h3 className="font-semibold mb-3">Quedas</h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Nome da queda (ex: 1ª Queda)"
                    value={newMatchName}
                    onChange={(e) => setNewMatchName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Mapa (opcional)"
                    value={newMatchMap}
                    onChange={(e) => setNewMatchMap(e.target.value)}
                    className="w-32"
                  />
                  <Button onClick={createMatch} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matches.map((match) => (
                    <Badge
                      key={match.id}
                      variant={selectedMatch === match.id ? "default" : "secondary"}
                      className="cursor-pointer flex items-center gap-1"
                      onClick={() => setSelectedMatch(match.id)}
                    >
                      {match.name}
                      {match.map_name && <span className="text-xs opacity-70">({match.map_name})</span>}
                      {match.status === "completed" && <span className="text-xs">✓</span>}
                      <Trash2
                        className="w-3 h-3 ml-1 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMatch(match.id);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Score Entry Section */}
            {selectedMatch && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Resultados da Queda</h3>
                  <Select onValueChange={(value) => addTeamScore(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="+ Adicionar Equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} [{team.tag}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {scores
                    .sort((a, b) => a.position - b.position)
                    .map((score) => {
                      const team = teams.find(t => t.id === score.team_id);
                      const pts = calculatePoints(score.position, score.kills);
                      
                      return (
                        <Card key={score.team_id} className="p-4">
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Team Info */}
                            <div className="flex items-center gap-2 min-w-[200px]">
                              {team?.logo_url && (
                                <img
                                  src={team.logo_url}
                                  alt={team.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium text-sm">{team?.name}</p>
                                <p className="text-xs text-muted-foreground">[{team?.tag}]</p>
                              </div>
                            </div>

                            {/* Position */}
                            <div>
                              <Label className="text-xs">Posição</Label>
                              <Select
                                value={score.position.toString()}
                                onValueChange={(value) => updateTeamPosition(score.team_id, parseInt(value))}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePositions.map((pos) => (
                                    <SelectItem 
                                      key={pos} 
                                      value={pos.toString()}
                                      disabled={scores.some(s => s.position === pos && s.team_id !== score.team_id)}
                                    >
                                      {pos}º
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Kills */}
                            <div>
                              <Label className="text-xs">Kills</Label>
                              <Input
                                type="number"
                                min="0"
                                value={score.kills}
                                onChange={(e) => updateTeamKills(score.team_id, parseInt(e.target.value) || 0)}
                                className="w-20"
                              />
                            </div>

                            {/* Points Display */}
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Pos:</span>
                                <span className="ml-1 font-semibold text-primary">{pts.posPoints}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Kills:</span>
                                <span className="ml-1 font-semibold text-primary">{pts.killPoints}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total:</span>
                                <span className="ml-1 font-bold text-primary">{pts.total}</span>
                              </div>
                            </div>

                            {/* Remove */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTeamScore(score.team_id)}
                              className="ml-auto"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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
                  <Button onClick={saveScores} disabled={saving} className="w-full mt-4 gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Pontuação
                  </Button>
                )}
              </div>
            )}

            {!selectedRound && rounds.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Crie uma rodada para começar a gerenciar a pontuação
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
