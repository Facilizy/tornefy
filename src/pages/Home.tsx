import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import TrainingCard from "@/components/TrainingCard";
import WeekCalendar from "@/components/WeekCalendar";
import HowItWorks from "@/components/HowItWorks";
import JoinCommunity from "@/components/JoinCommunity";
import FollowUsSection from "@/components/FollowUsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Zap } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userGames, setUserGames] = useState<string[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [liveTrainings, setLiveTrainings] = useState<any[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");

  useEffect(() => {
    checkUser();
    fetchTrainings();
  }, []);

  useEffect(() => {
    filterTrainings();
  }, [trainings, searchTerm, platformFilter, modeFilter, gameFilter, userGames]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      // Fetch user's preferred games
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_games")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.preferred_games) {
        setUserGames(profile.preferred_games);
      }
    }
  };

  const fetchTrainings = async () => {
    try {
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
      console.error("Erro ao carregar treinos:", error);
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
      filtered = filtered.filter((training) => training.platform === platformFilter);
    }

    if (modeFilter !== "all") {
      filtered = filtered.filter((training) => training.mode === modeFilter);
    }

    if (gameFilter !== "all") {
      filtered = filtered.filter((training) => training.game === gameFilter);
    } else if (user && userGames.length > 0) {
      // Auto-filter by user's preferred games when logged in
      const preferredScrims = filtered.filter((t) => userGames.includes(t.game));
      // If there are preferred scrims, show them first, otherwise show all
      if (preferredScrims.length > 0) {
        const otherScrims = filtered.filter((t) => !userGames.includes(t.game));
        filtered = [...preferredScrims, ...otherScrims];
      }
    }

    setFilteredTrainings(filtered);
  };

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-20 md:py-28 px-4 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="container mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium tracking-wide">Plataforma #1 de Scrims</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tighter leading-none">
            <span className="text-foreground">EVOLUA.</span>
            <br />
            <span className="text-primary">COMPETE.</span>
            <br />
            <span className="text-foreground">DOMINE.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A plataforma onde times de elite treinam, competem e evoluem juntos.
          </p>
        </div>
      </section>

      {/* Calendar Section */}
      <WeekCalendar trainings={trainings} />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Scrims Section */}
      <section id="scrims" className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 bg-card/50 border border-border rounded-xl p-6">
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
                <SelectItem value="battlefield_6">Battlefield 6</SelectItem>
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
      </section>

      {/* Follow Us Section */}
      <FollowUsSection />

      {/* Join Community Section */}
      <JoinCommunity />
    </MainLayout>
  );
};

// Discord Icon
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export default Home;
