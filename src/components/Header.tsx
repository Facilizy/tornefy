import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeaderProps {
  user?: any;
  profile?: any;
}

const Header = ({ user, profile }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado!");
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
        >
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover:text-primary-glow transition-colors" />
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl sm:text-2xl font-bold gradient-text">TORNEFY</h1>
            <span className="text-[10px] sm:text-xs text-muted-foreground">(BETA)</span>
          </div>
        </button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{profile?.full_name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                ({profile?.role})
              </span>
            </div>
            
            {profile?.role === "player" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/my-team")}
                className="border-primary/50 hover:bg-primary/10 text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">Minha Equipe</span>
                <span className="sm:hidden">Equipe</span>
              </Button>
            )}

            {profile?.role === "organizer" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/organizer")}
                className="border-primary/50 hover:bg-primary/10 text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">Painel Organizador</span>
                <span className="sm:hidden">Painel</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
