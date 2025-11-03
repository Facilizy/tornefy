import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import Header from "@/components/Header";
import TrainingCard from "@/components/TrainingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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
        fetchProfile(session.user.id);
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
      await fetchProfile(session.user.id);
    } else {
      navigate("/auth");
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Erro ao carregar perfil");
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

      const trainingsWithCount = trainingsData?.map((training) => ({
        ...training,
        registrations: training.training_registrations?.[0]?.count || 0,
      }));

      setTrainings(trainingsWithCount || []);
      setLiveTrainings(trainingsWithCount?.filter(t => t.is_live) || []);
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

  const getGameLogo = (game: string) => {
    const logos: Record<string, string> = {
      free_fire: "/game-logos/free-fire.png",
      blood_strike: "/game-logos/blood-strike.png",
      farlight_84: "/game-logos/farlight-84.png",
    };
    return logos[game] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center animate-fade-in">
          <h2 className="text-4xl font-bold mb-2">
            Bem-vindo aos <span className="gradient-text">X-Treinos</span>
          </h2>
          <p className="text-muted-foreground">
            Encontre e participe dos melhores treinos competitivos
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 backdrop-blur-sm bg-card/50 border border-border rounded-xl p-6 animate-slide-up">
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
              className="mt-4 text-primary hover:text-primary-glow"
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
              <h3 className="text-2xl font-bold gradient-text">Treinos Ao Vivo</h3>
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
      </main>
    </div>
  );
};

export default PlayerDashboard;
