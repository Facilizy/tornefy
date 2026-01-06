import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Medal,
  Users,
  Search,
  ChevronUp,
  ChevronDown,
  Minus,
  Loader2,
  Crown,
  Star,
  TrendingUp,
} from "lucide-react";

interface TeamRanking {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  rating: number;
  is_verified: boolean;
  memberCount: number;
  primary_color: string;
  region: string;
}

const Ranking = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members(count)
        `)
        .eq("is_external", false)
        .order("rating", { ascending: false });

      if (error) throw error;

      const teamsWithCount = data?.map((team: any) => ({
        id: team.id,
        name: team.name,
        tag: team.tag,
        logo_url: team.logo_url,
        rating: team.rating || 1000,
        is_verified: team.is_verified || false,
        memberCount: team.team_members?.[0]?.count || 0,
        primary_color: team.primary_color || "#DC2626",
        region: team.region || "BR",
      })) as TeamRanking[];

      setTeams(teamsWithCount || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.tag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === "all" || team.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (position === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (position === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
  };

  const getRankBgClass = (position: number) => {
    if (position === 1) return "bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-transparent border-yellow-500/50";
    if (position === 2) return "bg-gradient-to-r from-gray-400/20 via-gray-400/10 to-transparent border-gray-400/50";
    if (position === 3) return "bg-gradient-to-r from-amber-600/20 via-amber-600/10 to-transparent border-amber-600/50";
    return "bg-card/50 border-border";
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Purple Header Banner */}
      <div className="relative py-16 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-5xl font-black uppercase text-primary">Ranking</h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Classificação das equipes por T-Rating
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-card/50 border-border text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{teams.length}</p>
            <p className="text-xs text-muted-foreground">Equipes Ranqueadas</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{teams.filter(t => t.is_verified).length}</p>
            <p className="text-xs text-muted-foreground">Verificadas</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border text-center">
            <Crown className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{teams[0]?.rating || 0}</p>
            <p className="text-xs text-muted-foreground">Top Rating</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{teams.reduce((acc, t) => acc + t.memberCount, 0)}</p>
            <p className="text-xs text-muted-foreground">Total Jogadores</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card/50"
            />
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-full md:w-40 bg-card/50">
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Regiões</SelectItem>
              <SelectItem value="BR">Brasil</SelectItem>
              <SelectItem value="NA">América do Norte</SelectItem>
              <SelectItem value="EU">Europa</SelectItem>
              <SelectItem value="LATAM">LATAM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Top 3 Podium */}
        {filteredTeams.length >= 3 && (
          <div className="hidden md:grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <Card
              className="p-6 cursor-pointer hover:scale-105 transition-transform bg-gradient-to-b from-gray-400/20 to-transparent border-gray-400/30"
              onClick={() => navigate(`/team/${filteredTeams[1].id}`)}
            >
              <div className="text-center">
                <Medal className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                <div className="w-16 h-16 mx-auto rounded-full bg-card border-2 border-gray-400/50 overflow-hidden mb-3">
                  {filteredTeams[1].logo_url ? (
                    <img src={filteredTeams[1].logo_url} alt={filteredTeams[1].name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 m-auto mt-4 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-bold truncate">{filteredTeams[1].name}</h3>
                <p className="text-sm text-muted-foreground">[{filteredTeams[1].tag}]</p>
                <p className="text-xl font-bold text-gray-400 mt-2">{filteredTeams[1].rating} pts</p>
              </div>
            </Card>

            {/* 1st Place */}
            <Card
              className="p-6 cursor-pointer hover:scale-105 transition-transform bg-gradient-to-b from-yellow-500/20 to-transparent border-yellow-500/30 -mt-4"
              onClick={() => navigate(`/team/${filteredTeams[0].id}`)}
            >
              <div className="text-center">
                <Crown className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                <div className="w-20 h-20 mx-auto rounded-full bg-card border-2 border-yellow-500/50 overflow-hidden mb-3">
                  {filteredTeams[0].logo_url ? (
                    <img src={filteredTeams[0].logo_url} alt={filteredTeams[0].name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-10 h-10 m-auto mt-5 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-bold text-lg truncate">{filteredTeams[0].name}</h3>
                <p className="text-sm text-muted-foreground">[{filteredTeams[0].tag}]</p>
                <p className="text-2xl font-bold text-yellow-500 mt-2">{filteredTeams[0].rating} pts</p>
              </div>
            </Card>

            {/* 3rd Place */}
            <Card
              className="p-6 cursor-pointer hover:scale-105 transition-transform bg-gradient-to-b from-amber-600/20 to-transparent border-amber-600/30"
              onClick={() => navigate(`/team/${filteredTeams[2].id}`)}
            >
              <div className="text-center">
                <Medal className="w-10 h-10 mx-auto mb-3 text-amber-600" />
                <div className="w-16 h-16 mx-auto rounded-full bg-card border-2 border-amber-600/50 overflow-hidden mb-3">
                  {filteredTeams[2].logo_url ? (
                    <img src={filteredTeams[2].logo_url} alt={filteredTeams[2].name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 m-auto mt-4 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-bold truncate">{filteredTeams[2].name}</h3>
                <p className="text-sm text-muted-foreground">[{filteredTeams[2].tag}]</p>
                <p className="text-xl font-bold text-amber-600 mt-2">{filteredTeams[2].rating} pts</p>
              </div>
            </Card>
          </div>
        )}

        {/* Rankings List */}
        <div className="space-y-2">
          {filteredTeams.map((team, index) => (
            <Card
              key={team.id}
              className={`p-4 cursor-pointer hover:border-primary/50 transition-all ${getRankBgClass(index + 1)}`}
              onClick={() => navigate(`/team/${team.id}`)}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-12 flex items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>

                {/* Logo */}
                <div className="w-12 h-12 rounded-lg bg-card border border-border overflow-hidden flex-shrink-0">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 m-auto mt-3 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold truncate">{team.name}</h3>
                    {team.is_verified && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                        Verificado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">[{team.tag}]</p>
                </div>

                {/* Members */}
                <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{team.memberCount}</span>
                </div>

                {/* Region */}
                <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                  {team.region}
                </Badge>

                {/* Rating */}
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: index < 3 ? undefined : team.primary_color }}>
                    {team.rating}
                  </p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma equipe encontrada</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Ranking;
