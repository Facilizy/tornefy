import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TornefyLogo from "@/components/TornefyLogo";
import TornefyIcon from "@/components/TornefyIcon";
import TrainingCard from "@/components/TrainingCard";
import WeekCalendar from "@/components/WeekCalendar";
import HowItWorks from "@/components/HowItWorks";
import JoinCommunity from "@/components/JoinCommunity";
import Footer from "@/components/Footer";
import { NotificationBell } from "@/components/NotificationBell";
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
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, Zap, Trophy, Target, Menu, X, User, LogOut, Bell, Settings, Users, Home as HomeIcon, Gamepad2, Award, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const Home = () => {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkUser();
    fetchTrainings();
  }, []);

  useEffect(() => {
    filterTrainings();
  }, [trainings, searchTerm, platformFilter, modeFilter, gameFilter]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchProfile(session.user.id);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
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
      filtered = filtered.filter((training) => training.platform === platformFilter);
    }

    if (modeFilter !== "all") {
      filtered = filtered.filter((training) => training.mode === modeFilter);
    }

    if (gameFilter !== "all") {
      filtered = filtered.filter((training) => training.game === gameFilter);
    }

    setFilteredTrainings(filtered);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast.success("Logout realizado!");
  };

  const navItems = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Scrims", href: "/scrims", icon: Gamepad2 },
    { name: "Ranking", href: "/ranking", icon: Award },
    { name: "Equipes", href: "/equipes", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <TornefyLogo className="h-6 hidden sm:block" />
            <TornefyIcon className="h-8 w-8 sm:hidden" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell userId={user.id} />
                
                {/* Desktop User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="hidden md:flex">
                    <Button variant="ghost" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{profile?.full_name || 'Usuário'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <User className="w-4 h-4 mr-2" />
                      Ver Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/my-team')}>
                      <Users className="w-4 h-4 mr-2" />
                      Minha Equipe
                    </DropdownMenuItem>
                    {profile?.role === 'organizer' && (
                      <DropdownMenuItem onClick={() => navigate('/organizer')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Painel Organizador
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Discord link */}
                <a
                  href="https://discord.gg/bHgPsBfN7r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <DiscordIcon className="w-5 h-5" />
                </a>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Entrar
                </Button>
                <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
                  Criar Conta
                </Button>
                <a
                  href="https://discord.gg/bHgPsBfN7r"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-9 h-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <DiscordIcon className="w-5 h-5" />
                </a>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <TornefyIcon className="h-8 w-8" />
                    <div className="flex items-center gap-2">
                      {user && <NotificationBell userId={user.id} />}
                      <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Nav */}
                  <nav className="flex-1 p-4">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    ))}
                    
                    {user && (
                      <>
                        <div className="h-px bg-border my-4" />
                        <Link
                          to="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <User className="w-5 h-5" />
                          <span className="font-medium">Meu Perfil</span>
                        </Link>
                        <Link
                          to="/my-team"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Users className="w-5 h-5" />
                          <span className="font-medium">Minha Equipe</span>
                        </Link>
                        {profile?.role === 'organizer' && (
                          <Link
                            to="/organizer"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Settings className="w-5 h-5" />
                            <span className="font-medium">Painel Organizador</span>
                          </Link>
                        )}
                      </>
                    )}
                  </nav>

                  {/* Mobile Footer */}
                  <div className="p-4 border-t border-border space-y-3">
                    {user ? (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-destructive"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </Button>
                    ) : (
                      <>
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90"
                          onClick={() => {
                            navigate('/auth');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Criar Conta
                        </Button>
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigate('/auth');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Entrar
                        </Button>
                      </>
                    )}
                    <a
                      href="https://discord.gg/bHgPsBfN7r"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors"
                    >
                      <DiscordIcon className="w-5 h-5" />
                      <span>Entrar no Discord</span>
                    </a>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 px-4 text-center">
          <div className="container mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/10 border border-primary/30">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Plataforma #1 de Scrims</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
              DOMINE O <span className="text-primary">CENÁRIO</span>
              <br />
              COMPETITIVO
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Participe dos melhores treinos, evolua suas habilidades e 
              conquiste seu espaço entre os pro players.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Criar Conta
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8"
                onClick={() => document.getElementById('scrims')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver Scrims
              </Button>
              <a
                href="https://discord.gg/bHgPsBfN7r"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10 text-lg px-8"
                >
                  <DiscordIcon className="w-5 h-5 mr-2" />
                  Entrar no Discord
                </Button>
              </a>
            </div>

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
          {loading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredTrainings.length === 0 ? (
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

        {/* Join Community Section */}
        <JoinCommunity />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

// Discord Icon
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export default Home;
