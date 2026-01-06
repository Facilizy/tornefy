import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import TrainingCard from "@/components/TrainingCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Gamepad2, Trophy, Users, SlidersHorizontal } from "lucide-react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const Scrims = () => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [liveTrainings, setLiveTrainings] = useState<any[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    filterTrainings();
  }, [trainings, dateFilter, modeFilter, gameFilter]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data: trainingsData, error } = await supabase
        .from("trainings")
        .select(`*, training_registrations(count)`)
        .gte("datetime", new Date().toISOString())
        .order("datetime", { ascending: true });

      if (error) throw error;

      const trainingsWithCount = trainingsData?.map((training) => ({
        ...training,
        registrations: training.training_registrations?.[0]?.count || 0,
      }));

      setTrainings(trainingsWithCount || []);
      setLiveTrainings(trainingsWithCount?.filter(t => t.is_live) || []);
    } catch (error) {
      console.error("Erro ao carregar scrims:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTrainings = () => {
    let filtered = [...trainings];

    // Date filter
    if (dateFilter !== "all") {
      const today = startOfDay(new Date());
      
      if (dateFilter === "today") {
        const todayEnd = endOfDay(new Date());
        filtered = filtered.filter((t) => {
          const date = new Date(t.datetime);
          return date >= today && date <= todayEnd;
        });
      } else if (dateFilter === "tomorrow") {
        const tomorrow = addDays(today, 1);
        const tomorrowEnd = endOfDay(tomorrow);
        filtered = filtered.filter((t) => {
          const date = new Date(t.datetime);
          return date >= tomorrow && date <= tomorrowEnd;
        });
      } else if (dateFilter === "week") {
        const weekEnd = addDays(today, 7);
        filtered = filtered.filter((t) => {
          const date = new Date(t.datetime);
          return date >= today && date <= weekEnd;
        });
      }
    }

    // Mode filter
    if (modeFilter !== "all") {
      filtered = filtered.filter((t) => t.mode === modeFilter);
    }

    // Game filter
    if (gameFilter !== "all") {
      filtered = filtered.filter((t) => t.game === gameFilter);
    }

    setFilteredTrainings(filtered);
  };

  const clearFilters = () => {
    setDateFilter("all");
    setModeFilter("all");
    setGameFilter("all");
  };

  const hasActiveFilters = dateFilter !== "all" || modeFilter !== "all" || gameFilter !== "all";

  const getGameName = (game: string) => {
    const games: Record<string, string> = {
      free_fire: "Free Fire",
      blood_strike: "Blood Strike",
      farlight_84: "Farlight 84",
      prime_rush: "Prime Rush",
      battlefield_6: "Battlefield 6",
    };
    return games[game] || game;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              Scrims Abertas
            </h1>
            <p className="text-muted-foreground mt-1">
              Encontre e participe das melhores scrims competitivas
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
              <Users className="w-4 h-4 text-primary" />
              <span>{trainings.length} scrims</span>
            </div>
            {liveTrainings.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg border border-destructive/20">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-destructive">{liveTrainings.length} ao vivo</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-card border border-border rounded-xl p-4 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Filtros</span>
            </div>

            <div className="flex flex-wrap gap-3 flex-1">
              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px] bg-background/50">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="tomorrow">Amanhã</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                </SelectContent>
              </Select>

              {/* Mode Filter */}
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-[130px] bg-background/50">
                  <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os modos</SelectItem>
                  <SelectItem value="Solo">Solo</SelectItem>
                  <SelectItem value="Duo">Duo</SelectItem>
                  <SelectItem value="Squad">Squad</SelectItem>
                </SelectContent>
              </Select>

              {/* Game Filter */}
              <Select value={gameFilter} onValueChange={setGameFilter}>
                <SelectTrigger className="w-[150px] bg-background/50">
                  <Gamepad2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Jogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os jogos</SelectItem>
                  <SelectItem value="free_fire">Free Fire</SelectItem>
                  <SelectItem value="blood_strike">Blood Strike</SelectItem>
                  <SelectItem value="farlight_84">Farlight 84</SelectItem>
                  <SelectItem value="prime_rush">Prime Rush</SelectItem>
                  <SelectItem value="battlefield_6">Battlefield 6</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-primary hover:text-primary/80"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Live Scrims */}
            {liveTrainings.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <h2 className="text-xl font-bold uppercase tracking-wide">Ao Vivo</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveTrainings.map((training) => (
                    <TrainingCard key={training.id} training={training} />
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {filteredTrainings.length === 0 ? (
              <div className="text-center py-20">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma scrim encontrada</h3>
                <p className="text-muted-foreground mb-6">
                  Tente ajustar os filtros ou volte mais tarde
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold uppercase tracking-wide">
                    Próximas Scrims
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {filteredTrainings.length} resultado{filteredTrainings.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTrainings.map((training) => (
                    <TrainingCard key={training.id} training={training} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Scrims;
