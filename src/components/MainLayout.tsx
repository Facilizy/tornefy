import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TornefyLogo from "@/components/TornefyLogo";
import Footer from "@/components/Footer";
import { NotificationBell } from "@/components/NotificationBell";
import { UpcomingScrimWidget } from "@/components/UpcomingScrimWidget";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Menu, X, User, LogOut, Settings, Users, Home as HomeIcon, Gamepad2, Award, ChevronDown, Bell } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface MainLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

const MainLayout = ({ children, showFooter = true }: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { role } = useUserRole(user?.id);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast.success("Logout realizado!");
    navigate("/");
  };

  const navItems = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Scrims", href: "/scrims", icon: Gamepad2 },
    { name: "Ranking", href: "/ranking", icon: Award },
    { name: "Equipes", href: "/equipes", icon: Users },
  ];

  const isActiveRoute = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <TornefyLogo className="h-6" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors uppercase tracking-wide ${
                  isActiveRoute(item.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Desktop: Notifications */}
                <div className="hidden md:block">
                  <NotificationBell userId={user.id} />
                </div>
                
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
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      Ver Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/my-team')}>
                      <Users className="w-4 h-4 mr-2" />
                      Minha Equipe
                    </DropdownMenuItem>
                    {role === 'organizer' && (
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

                {/* Discord link with tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://discord.gg/bHgPsBfN7r"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <DiscordIcon className="w-5 h-5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Entre no Nosso Discord</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Button variant="ghost" onClick={() => navigate('/auth')}>
                  Entrar
                </Button>
                <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
                  Criar Conta
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href="https://discord.gg/bHgPsBfN7r"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-9 h-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <DiscordIcon className="w-5 h-5" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Entre no Nosso Discord</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Mobile: Only hamburger menu */}
            <div className="flex items-center md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <div className="flex flex-col h-full">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <TornefyLogo className="h-6" />
                      <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Mobile Nav */}
                    <nav className="flex-1 p-4">
                      {navItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            isActiveRoute(item.href)
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      ))}
                      
                      {user && (
                        <>
                          <div className="h-px bg-border my-4" />
                          
                          {/* Notifications inside mobile menu */}
                          <Link
                            to="/notifications"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Bell className="w-5 h-5" />
                            <span className="font-medium">Notificações</span>
                          </Link>
                          
                          <Link
                            to="/profile"
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
                          {role === 'organizer' && (
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
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {showFooter && <Footer />}
      
      {/* Upcoming Scrim Widget */}
      <UpcomingScrimWidget />
    </div>
  );
};

// Discord Icon
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export default MainLayout;
