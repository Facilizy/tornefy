import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Filter, Loader2, Trophy, UserPlus } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_external: boolean;
  is_verified: boolean;
  is_recruiting: boolean;
  region: string;
  rating: number;
  memberCount: number;
  primary_color: string;
}

const Teams = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"ranking" | "explore">("explore");

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    filterTeams();
  }, [teams, searchTerm, typeFilter, recruitingOnly, viewMode]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members(count)
        `)
        .order("rating", { ascending: false });

      if (error) throw error;

      const teamsWithCount = data?.map((team: any) => ({
        ...team,
        memberCount: team.team_members?.[0]?.count || 0,
        primary_color: team.primary_color || "#9146FF",
      })) as Team[];

      setTeams(teamsWithCount || []);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTeams = () => {
    let filtered = [...teams];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (team) =>
          team.name.toLowerCase().includes(term) ||
          team.tag.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((team) =>
        typeFilter === "verified" ? team.is_verified : !team.is_verified
      );
    }

    if (recruitingOnly) {
      filtered = filtered.filter((team) => team.is_recruiting);
    }

    if (viewMode === "ranking") {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    setFilteredTeams(filtered);
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
      <header className="relative py-14 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/16 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
              Equipes
            </h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Explore as melhores equipes competitivas da plataforma
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-10">
        {/* Top bar */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "ranking" | "explore")}
          >
            <TabsList className="bg-card/50">
              <TabsTrigger
                value="ranking"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Trophy className="w-4 h-4" />
                Ranking
              </TabsTrigger>
              <TabsTrigger
                value="explore"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="w-4 h-4" />
                Explorar
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-sm text-muted-foreground md:text-right">
            <Filter className="w-4 h-4 inline mr-1" />
            {filteredTeams.length} equipe{filteredTeams.length !== 1 ? "s" : ""}
          </p>
        </section>

        {/* Filters */}
        <section className="mb-8 bg-card/50 border border-border rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3 md:gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/40"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full bg-background/40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="verified">Verificadas</SelectItem>
                <SelectItem value="external">Outras</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 justify-between md:justify-start">
              <Label htmlFor="recruiting" className="text-sm whitespace-nowrap">
                Só recrutando
              </Label>
              <Switch
                id="recruiting"
                checked={recruitingOnly}
                onCheckedChange={setRecruitingOnly}
              />
            </div>
          </div>
        </section>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma equipe encontrada
            </h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <Card
                key={team.id}
                className="overflow-hidden bg-card border-border hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/team/${team.id}`)}
                style={{
                  borderTopColor: team.primary_color,
                  borderTopWidth: "3px",
                }}
              >
                {/* Banner */}
                <div 
                  className="h-24 relative"
                  style={{
                    background: team.banner_url 
                      ? `url(${team.banner_url}) center/cover` 
                      : `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.6) 100%)`,
                  }}
                >
                  {/* Rating Badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
                    <Trophy className="w-3 h-3 text-primary" />
                    <span className="text-xs font-bold">{team.rating}</span>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {team.is_verified && (
                      <Badge className="bg-card/80 text-foreground border-border text-xs backdrop-blur-sm">
                        <VerifiedBadge />
                        Verificado
                      </Badge>
                    )}
                    {team.is_recruiting && (
                      <Badge className="bg-primary/90 text-primary-foreground border-0 text-xs">
                        <UserPlus className="w-3 h-3 mr-1" />
                        Recrutando
                      </Badge>
                    )}
                  </div>

                  {/* Logo */}
                  <div className="absolute -bottom-8 left-4">
                    <div className="w-16 h-16 rounded-lg bg-card border-2 border-background overflow-hidden flex items-center justify-center shadow-lg">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="pt-10 pb-4 px-4">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                    {team.name}
                  </h3>
                  <p className="text-muted-foreground text-sm">[{team.tag}]</p>
                  
                  {team.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {team.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {team.memberCount}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {team.region || "BR"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default Teams;
