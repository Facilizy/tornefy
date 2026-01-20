import { useRef, useState, useEffect } from "react";
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
  is_external: boolean | null;
  is_verified: boolean;
  is_recruiting: boolean;
  region: string;
  rating: number;
  memberCount: number;
  primary_color: string;
}

type PlayerProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const Teams = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"players" | "explore">("explore");

  const rtRefetchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([fetchTeams(), fetchPlayers()]).finally(() => setLoading(false));

    const schedule = () => {
      if (rtRefetchTimeoutRef.current) window.clearTimeout(rtRefetchTimeoutRef.current);
      rtRefetchTimeoutRef.current = window.setTimeout(async () => {
        await Promise.all([fetchTeams(), fetchPlayers()]);
      }, 300);
    };

    const channel = supabase
      .channel("rt-teams-and-players")
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, schedule)
      .subscribe();

    return () => {
      if (rtRefetchTimeoutRef.current) window.clearTimeout(rtRefetchTimeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTeamsAndPlayers();
  }, [teams, players, searchTerm, typeFilter, recruitingOnly, viewMode]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select(
          `
          *,
          team_members(count)
        `
        )
        // show only real teams; older rows may have is_external = NULL
        .or("is_external.is.null,is_external.eq.false")
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
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlayers((data || []) as PlayerProfile[]);
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const filterTeamsAndPlayers = () => {
    // Teams
    let filteredT = [...teams];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredT = filteredT.filter(
        (team) =>
          team.name.toLowerCase().includes(term) ||
          team.tag.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== "all") {
      filteredT = filteredT.filter((team) => team.is_verified);
    }

    if (recruitingOnly) {
      filteredT = filteredT.filter((team) => team.is_recruiting);
    }

    setFilteredTeams(filteredT);

    // Players
    let filteredP = [...players];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredP = filteredP.filter((p) => {
        const uname = (p.username || "").toLowerCase();
        const fname = (p.full_name || "").toLowerCase();
        return uname.includes(term) || fname.includes(term);
      });
    }
    setFilteredPlayers(filteredP);
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
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="bg-card/50">
              <TabsTrigger
                value="players"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="w-4 h-4" />
                Jogadores
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
            {viewMode === "players"
              ? `${filteredPlayers.length} jogador${filteredPlayers.length !== 1 ? "es" : ""}`
              : `${filteredTeams.length} equipe${filteredTeams.length !== 1 ? "s" : ""}`}
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

        {/* Content */}
        {viewMode === "players" ? (
          filteredPlayers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum jogador encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar a busca</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlayers.map((p) => (
                <Card
                  key={p.id}
                  className="p-4 bg-card border-border hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/profile/${p.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.full_name ? `Avatar de ${p.full_name}` : "Avatar do jogador"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold uppercase truncate">
                        {p.full_name || "Jogador"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        @{p.username || "sem-username"}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma equipe encontrada</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros de busca</p>
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
                          loading="lazy"
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
