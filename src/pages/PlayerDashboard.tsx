import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import TrainingCard from "@/components/TrainingCard";
import WeekCalendar from "@/components/WeekCalendar";
import HowItWorks from "@/components/HowItWorks";
import FollowUsSection from "@/components/FollowUsSection";
import JoinCommunity from "@/components/JoinCommunity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Zap, Trophy, Target } from "lucide-react";
import { toast } from "sonner";
import { withOrganizerMeta } from "@/lib/training-organizer-meta";

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [liveTrainings, setLiveTrainings] = useState<any[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");

  useEffect(() => {
    checkUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTrainings();
    }
  }, [user]);

  useEffect(() => {
    filterTrainings();
  }, [trainings, searchTerm, platformFilter, modeFilter, gameFilter]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    } else {
      navigate("/auth");
    }
  };

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data: trainingsData, error: trainingsError } = await supabase
        .from("trainings")
        .select(`
          *,
          training_registrations(count)
        `)
        .gte("datetime", new Date().toISOString())
        .order("datetime", { ascending: true });

      if (trainingsError) throw trainingsError;

      const trainingsWithCount = (trainingsData || []).map((training) => ({
        ...training,
        registrations: training.training_registrations?.[0]?.count || 0,
      }));

      const enriched = await withOrganizerMeta(trainingsWithCount);

      setTrainings(enriched || []);
      setLiveTrainings(enriched?.filter((t) => t.is_live) || []);
    } catch (error: any) {
      toast.error("Erro ao carregar treinos");
    } finally {
      setLoading(false);
    }
  };

  const filterTrainings = () => {
    let filtered = [...trainings];

    if (searchTerm) {
      filtered = filtered.filter((training) =>
        training.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (platformFilter !== "all") {
      filtered = filtered.filter(
        (training) => training.platform === platformFilter
      );
    }

    if (modeFilter !== "all") {
      filtered = filtered.filter((training) => training.mode === modeFilter);
    }

    if (gameFilter !== "all") {
      filtered = filtered.filter((training) => training.game === gameFilter);
    }

    setFilteredTrainings(filtered);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="relative py-16 px-4 text-center overflow-hidden">
        <div className="relative z-10 container mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/10 border border-primary/30">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Plataforma #1 de Scrims</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            DOMINE O <span className="text-primary">CENÁRIO</span>
            <br />
            COMPETITIVO
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Participe dos melhores treinos, evolua suas habilidades e 
            conquiste seu espaço entre os pro players.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span>Ranking em tempo real</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-destructive" />
              <span>Scrims competitivas</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span>Múltiplos jogos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <WeekCalendar trainings={trainings} />

      {/* How It Works Section */}
      <HowItWorks />

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 backdrop-blur-sm bg-card/50 border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Filtros</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            <Select value={gameFilter} onValueChange={setGameFilter}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Jogo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Jogos</SelectItem>
                <SelectItem value="free_fire">Free Fire</SelectItem>
                <SelectItem value="blood_strike">Blood Strike</SelectItem>
                <SelectItem value="farlight_84">Farlight 84</SelectItem>
                <SelectItem value="prime_rush">Prime Rush</SelectItem>
                <SelectItem value="pubg_mobile">PUBG Mobile</SelectItem>
              </SelectContent>
            </Select>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="PC">PC</SelectItem>
                <SelectItem value="Mobile">Mobile</SelectItem>
                <SelectItem value="Misto">Misto</SelectItem>
              </SelectContent>
            </Select>

            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Solo">Solo</SelectItem>
                <SelectItem value="Duo">Duo</SelectItem>
                <SelectItem value="Squad">Squad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchTerm || platformFilter !== "all" || modeFilter !== "all" || gameFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setPlatformFilter("all");
                setModeFilter("all");
                setGameFilter("all");
              }}
              className="mt-4 text-primary"
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Live Trainings Section */}
        {liveTrainings.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-destructive text-2xl">●</span>
              <h3 className="text-2xl font-bold text-primary">Treinos Ao Vivo</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveTrainings.map((training) => (
                <TrainingCard key={training.id} training={training} />
              ))}
            </div>
          </div>
        )}

        {/* Trainings Grid */}
        {filteredTrainings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              Nenhum treino encontrado
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold mb-4">Próximos Treinos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrainings.map((training) => (
                <TrainingCard key={training.id} training={training} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Follow Us Section */}
      <FollowUsSection />

      {/* Join Community Section */}
      <JoinCommunity />
    </MainLayout>
  );
};

export default PlayerDashboard;