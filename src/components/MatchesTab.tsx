import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScoreManagementDialog } from "@/components/ScoreManagementDialog";
import { Swords, Trophy, Target, ChevronRight, LogIn } from "lucide-react";

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
}

interface PositionPoint {
  position: number;
  points: number;
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
  id: string;
  team_id: string;
  position: number;
  kills: number;
  position_points: number;
  kill_points: number;
  total_points: number;
}

interface MatchesTabProps {
  trainingId: string;
  isOrganizer: boolean;
  isAuthenticated?: boolean;
  teams: Team[];
  pointsPerKill: number;
  pointsPerPosition: PositionPoint[];
  tableImageUrl?: string;
  onScoresUpdated: () => void;
  primaryColor?: string;
}

export function MatchesTab({
  trainingId,
  isOrganizer,
  isAuthenticated = true,
  teams,
  pointsPerKill,
  pointsPerPosition,
  tableImageUrl,
  onScoresUpdated,
  primaryColor = "#9146FF",
}: MatchesTabProps) {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<MatchScore[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRounds();
  }, [trainingId]);

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
      if (data.length > 0) {
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
      .eq("match_id", matchId)
      .order("position");

    if (!error && data) {
      setScores(data);
    } else {
      setScores([]);
    }
  };

  const getTeamById = (teamId: string) => {
    return teams.find((t) => t.id === teamId);
  };

  const selectedRoundData = rounds.find((r) => r.id === selectedRound);
  const selectedMatchData = matches.find((m) => m.id === selectedMatch);

  if (loading) {
    return (
      <Card className="p-6 bg-card/80 border-border">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  // Login required card for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Card className="p-8 bg-card/80 border-border">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <LogIn className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Login necessário</h3>
            <p className="text-sm text-muted-foreground">
              Faça login para visualizar as partidas e resultados deste evento.
            </p>
          </div>
          <Button onClick={() => navigate("/auth")} style={{ backgroundColor: primaryColor }}>
            <LogIn className="w-4 h-4 mr-2" />
            Fazer login
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/80 border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold" style={{ color: primaryColor }}>Partidas</h2>
        {isOrganizer && (
          <ScoreManagementDialog
            trainingId={trainingId}
            teams={teams}
            pointsPerKill={pointsPerKill}
            pointsPerPosition={pointsPerPosition}
            onScoresUpdated={() => {
              fetchRounds();
              onScoresUpdated();
            }}
          />
        )}
      </div>

      {tableImageUrl && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
              Tabela de Resultados
            </h3>
          <img
            src={tableImageUrl}
            alt="Tabela de resultados"
            className="w-full rounded-lg border border-border"
          />
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Swords className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Nenhuma rodada criada ainda</p>
          {isOrganizer && (
            <p className="text-sm">Use o botão "Gerenciar Pontuação" para adicionar rodadas e quedas</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Round Selection */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: primaryColor }} />
              Selecione a Rodada
            </h3>
            <div className="flex flex-wrap gap-2">
              {rounds.map((round) => (
                <Button
                  key={round.id}
                  variant={selectedRound === round.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRound(round.id)}
                  style={selectedRound === round.id ? { backgroundColor: primaryColor } : {}}
                >
                  {round.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Match Selection */}
          {selectedRound && matches.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4" style={{ color: primaryColor }} />
                Quedas - {selectedRoundData?.name}
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {matches.map((match) => (
                  <Button
                    key={match.id}
                    variant={selectedMatch === match.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMatch(match.id)}
                    style={selectedMatch === match.id ? { backgroundColor: primaryColor } : {}}
                  >
                    {match.name}
                    {match.map_name && (
                      <span className="text-xs opacity-70 ml-1">({match.map_name})</span>
                    )}
                    {match.status === "completed" && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        ✓
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Match Results */}
          {selectedMatch && scores.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
                Resultado: {selectedMatchData?.name}
                {selectedMatchData?.map_name && (
                  <Badge variant="outline" className="ml-2">
                    {selectedMatchData.map_name}
                  </Badge>
                )}
              </h3>

              <div className="space-y-2">
                {scores.map((score) => {
                  const team = getTeamById(score.team_id);
                  if (!team) return null;

                  return (
                    <div
                      key={score.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        score.position <= 3
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      {/* Position */}
                      <div
                        className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg ${
                          score.position === 1
                            ? "bg-yellow-500/20 text-yellow-500"
                            : score.position === 2
                            ? "bg-gray-400/20 text-gray-400"
                            : score.position === 3
                            ? "bg-orange-500/20 text-orange-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {score.position}º
                      </div>

                      {/* Team Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {team.logo_url && (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm uppercase truncate">
                            {team.name}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            [{team.tag}]
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Kills</p>
                          <p className="font-bold" style={{ color: primaryColor }}>{score.kills}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Pontos</p>
                          <p className="font-bold">{score.total_points}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Points Breakdown */}
              <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold">Sistema de pontos:</span> Posição +{" "}
                  {pointsPerKill} pt(s) por kill
                </p>
              </div>
            </div>
          )}

          {/* No results message */}
          {selectedMatch && scores.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Swords className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum resultado registrado nesta queda</p>
              {isOrganizer && (
                <p className="text-sm mt-1">
                  Use "Gerenciar Pontuação" para adicionar os resultados
                </p>
              )}
            </div>
          )}

          {/* No matches message */}
          {selectedRound && matches.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Swords className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma queda nesta rodada</p>
              {isOrganizer && (
                <p className="text-sm mt-1">
                  Use "Gerenciar Pontuação" para adicionar quedas
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
