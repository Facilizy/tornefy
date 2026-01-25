import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import TornefyLogo from "@/components/TornefyLogo";
import { Badge } from "@/components/ui/badge";
import { OrganizerBadge } from "@/components/OrganizerBadge";
import { useVerifiedEntity } from "@/hooks/useVerifiedEntities";
import { PlayerVerifiedBadge } from "@/components/PlayerVerifiedBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  user?: any;
}

const Header = ({ user }: HeaderProps) => {
  const navigate = useNavigate();
  const { role, isOrganizerVerified } = useUserRole(user?.id);
  const { verified: isUserVerified } = useVerifiedEntity("user", user?.id);
  const [profile, setProfile] = useState<any>(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchPendingInvites(user.id);
    }
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    
    setProfile(data);
  };

  const fetchPendingInvites = async (userId: string) => {
    const { count, error } = await supabase
      .from("team_invites")
      .select("*", { count: "exact", head: true })
      .eq("invited_user_id", userId)
      // Legacy support: NULL status should be treated as pending
      .or("status.eq.pending,status.is.null");

    if (error) {
      console.error("Error fetching pending invites count:", error);
      setPendingInvitesCount(0);
      return;
    }

    setPendingInvitesCount(count || 0);
  };

  const handleLogout = async () => {
    try {
      // Evita erro de "Session not found" quando o refresh token já expirou/foi limpo.
      await (supabase.auth as any).signOut({ scope: "local" });
    } catch {
      // best-effort
    } finally {
      toast.success("Logout realizado!");
      navigate("/auth");
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
        >
          <TornefyLogo className="h-6 sm:h-8" />
          <span className="hidden sm:inline text-[10px] sm:text-xs text-muted-foreground">(BETA)</span>
        </button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile: compact header (logo + hamburger) */}
            <div className="flex md:hidden items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Abrir menu" className="h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>

                  <div className="mt-4 rounded-lg border border-border bg-card/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold truncate">{profile?.full_name || "Usuário"}</span>
                      {isUserVerified ? <PlayerVerifiedBadge variant="icon" size="sm" /> : null}
                      {isOrganizerVerified ? <OrganizerBadge variant="icon" size="sm" /> : null}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">({role})</div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate("/")}
                    >
                      Início
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate("/faq")}
                    >
                      FAQ
                    </Button>

                    {role === "player" && (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => navigate("/my-team")}
                        >
                          Minha Equipe
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => navigate("/invites")}
                        >
                          Convites
                          {pendingInvitesCount > 0 && (
                            <Badge className="ml-2 bg-destructive">
                              {pendingInvitesCount}
                            </Badge>
                          )}
                        </Button>
                      </>
                    )}

                    {role === "organizer" && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => navigate("/organizer")}
                      >
                        Painel Organizador
                      </Button>
                    )}

                    <Separator className="my-3" />

                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop: keep current header */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{profile?.full_name}</span>
              {isUserVerified ? <PlayerVerifiedBadge variant="icon" size="sm" /> : null}
              {isOrganizerVerified ? <OrganizerBadge variant="icon" size="sm" /> : null}
              <span className="text-xs text-muted-foreground capitalize">
                ({role})
              </span>
            </div>

            {/* Pending Invites Button (desktop only) */}
            {role === "player" && (
              <div className="hidden md:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/invites")}
                    className="relative"
                    aria-label="Convites"
                  >
                    <Mail className="w-4 h-4" />
                    {pendingInvitesCount > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive"
                      >
                        {pendingInvitesCount}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Convites de equipes {pendingInvitesCount > 0 && `(${pendingInvitesCount})`}</p>
                </TooltipContent>
              </Tooltip>
              </div>
            )}

            <div className="hidden md:block">
              <NotificationBell userId={user?.id} />
            </div>
            
            {role === "player" && (
              <div className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/my-team")}
                className="border-primary/50 hover:bg-primary/10 hover:text-white text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">Minha Equipe</span>
                <span className="sm:hidden">Equipe</span>
              </Button>
              </div>
            )}

            {role === "organizer" && (
              <div className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/organizer")}
                className="border-primary/50 hover:bg-primary/10 hover:text-white text-xs sm:text-sm px-2 sm:px-4"
              >
                <span className="hidden sm:inline">Painel Organizador</span>
                <span className="sm:hidden">Painel</span>
              </Button>
              </div>
            )}

            <div className="hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hover:text-destructive"
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;