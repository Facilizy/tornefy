import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { User, Edit, Trophy, Gamepad2, Monitor, Award, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [stats, setStats] = useState({
    totalScrims: 0,
    totalBadges: 0,
    unlockedBadges: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, [userId]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    setUser(session?.user || null);
    
    // If no userId param, show current user's profile
    const targetUserId = userId || currentUserId;
    
    if (!targetUserId) {
      navigate("/auth");
      return;
    }
    
    setIsOwnProfile(currentUserId === targetUserId);
    await fetchProfile(targetUserId);
    await fetchStats(targetUserId);
  };

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      toast.error("Perfil não encontrado");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (uid: string) => {
    try {
      // Fetch team for the user
      const { data: team } = await supabase
        .from("teams")
        .select("id")
        .eq("owner_id", uid)
        .maybeSingle();

      if (team) {
        // Count scrims participated
        const { count: scrimsCount } = await supabase
          .from("training_registrations")
          .select("*", { count: "exact", head: true })
          .eq("team_id", team.id);

        setStats({
          totalScrims: scrimsCount || 0,
          totalBadges: 20, // Placeholder for badge system
          unlockedBadges: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 via-destructive/10 to-primary/20 overflow-hidden">
        {profile?.banner_url && (
          <img
            src={profile.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-8">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-lg border-4 border-primary/50 bg-card overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-primary" />
            )}
          </div>

          <div className="flex-1 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black uppercase">
                {profile?.full_name || "Usuário"}
              </h1>
              {profile?.role && (
                <span className="text-sm text-muted-foreground capitalize">
                  {profile.role}
                </span>
              )}
            </div>

            {isOwnProfile && (
              <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mb-12">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="scrims" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Scrims
            </TabsTrigger>
            <TabsTrigger value="overlays" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Overlays
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Tracker Card */}
            <Card className="p-6 bg-card/50 border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Tracker não vinculado</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure seu EA ID nas configurações do perfil para ver suas estatísticas.
                  </p>
                </div>
              </div>
            </Card>

            {/* Conquistas Card */}
            <Card className="p-6 bg-card/50 border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold uppercase">Conquistas</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats.unlockedBadges} de {stats.totalBadges} desbloqueadas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary border border-primary/30 px-2 py-0.5 rounded">
                    {Math.round((stats.unlockedBadges / stats.totalBadges) * 100)}%
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <Progress value={(stats.unlockedBadges / stats.totalBadges) * 100} className="h-1" />
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-card/50 border-border text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalScrims}</p>
                <p className="text-sm text-muted-foreground">Scrims Jogadas</p>
              </Card>
              <Card className="p-4 bg-card/50 border-border text-center">
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground">Vitórias</p>
              </Card>
              <Card className="p-4 bg-card/50 border-border text-center">
                <p className="text-2xl font-bold text-primary">0%</p>
                <p className="text-sm text-muted-foreground">Winrate</p>
              </Card>
              <Card className="p-4 bg-card/50 border-border text-center">
                <p className="text-2xl font-bold text-primary">{stats.unlockedBadges}</p>
                <p className="text-sm text-muted-foreground">Badges</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scrims">
            <Card className="p-8 bg-card/50 border-border text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Histórico de Scrims</h3>
              <p className="text-muted-foreground">
                {stats.totalScrims > 0
                  ? `${stats.totalScrims} scrims participadas`
                  : "Nenhuma scrim jogada ainda"}
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="overlays">
            <Card className="p-8 bg-card/50 border-border text-center">
              <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Overlays</h3>
              <p className="text-muted-foreground">
                Em breve você poderá configurar overlays personalizados.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default UserProfile;
