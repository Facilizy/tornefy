import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Target, Crown, Medal } from "lucide-react";

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
}

interface TeamStanding {
  team: Team;
  totalKills: number;
  totalPositionPoints: number;
  totalKillPoints: number;
  totalPoints: number;
  matchesPlayed: number;
}

interface Round {
  id: string;
  name: string;
  round_number: number;
}

interface ScoreboardProps {
  trainingId: string;
  teams: Team[];
}

export function Scoreboard({ trainingId, teams }: ScoreboardProps) {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRounds();
    fetchStandings();
  }, [trainingId]);

  useEffect(() => {
    fetchStandings();
  }, [selectedRound]);

  const fetchRounds = async () => {
    const { data } = await supabase
      .from("training_rounds")
      .select("*")
      .eq("training_id", trainingId)
      .order("round_number");

    if (data) {
      setRounds(data);
    }
  };

  const fetchStandings = async () => {
    setLoading(true);
    
    let query = supabase
      .from("training_match_scores")
      .select(`
        *,
        training_matches!inner (
          id,
          training_id,
          round_id
        )
      `)
      .eq("training_matches.training_id", trainingId);

    if (selectedRound && selectedRound !== "all") {
      query = query.eq("training_matches.round_id", selectedRound);
    }

    const { data: scores } = await query;

    if (scores && scores.length > 0) {
      // Aggregate scores per team
      const teamScores: Record<string, {
        totalKills: number;
        totalPositionPoints: number;
        totalKillPoints: number;
        totalPoints: number;
        matchesPlayed: number;
      }> = {};

      scores.forEach((score) => {
        if (!teamScores[score.team_id]) {
          teamScores[score.team_id] = {
            totalKills: 0,
            totalPositionPoints: 0,
            totalKillPoints: 0,
            totalPoints: 0,
            matchesPlayed: 0,
          };
        }

        teamScores[score.team_id].totalKills += score.kills;
        teamScores[score.team_id].totalPositionPoints += score.position_points;
        teamScores[score.team_id].totalKillPoints += score.kill_points;
        teamScores[score.team_id].totalPoints += score.total_points;
        teamScores[score.team_id].matchesPlayed += 1;
      });

      // Build standings array
      const standingsArray: TeamStanding[] = Object.entries(teamScores)
        .map(([teamId, stats]) => {
          const team = teams.find(t => t.id === teamId);
          return {
            team: team || { id: teamId, name: "Equipe Desconhecida", tag: "???" },
            ...stats,
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints);

      setStandings(standingsArray);
    } else {
      setStandings([]);
    }

    setLoading(false);
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRowStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-500/10 border-l-4 border-l-yellow-500";
      case 2:
        return "bg-gray-400/10 border-l-4 border-l-gray-400";
      case 3:
        return "bg-amber-600/10 border-l-4 border-l-amber-600";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (standings.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 backdrop-blur-sm bg-card/80 border-border">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Classificação Geral
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todas as rodadas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as rodadas</SelectItem>
              {rounds.map((round) => (
                <SelectItem key={round.id} value={round.id}>
                  {round.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">P</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead className="text-center">J</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Target className="w-4 h-4" />
                  K
                </div>
              </TableHead>
              <TableHead className="text-center text-primary font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((standing, index) => (
              <TableRow key={standing.team.id} className={getRowStyle(index + 1)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getPositionIcon(index + 1)}
                    <span className="font-bold">{index + 1}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {standing.team.logo_url ? (
                      <img
                        src={standing.team.logo_url}
                        alt={standing.team.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold">{standing.team.tag.slice(0, 2)}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{standing.team.name.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">[{standing.team.tag.toUpperCase()}]</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">{standing.matchesPlayed}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="gap-1">
                    <Target className="w-3 h-3" />
                    {standing.totalKills}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-lg font-bold text-primary">{standing.totalPoints}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
