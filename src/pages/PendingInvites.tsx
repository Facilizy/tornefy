import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  Mail, 
  Check, 
  X, 
  ArrowLeft,
  Users,
  Shield,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { buildNotificationRow } from "@/lib/notifications";

interface TeamInvite {
  id: string;
  team_id: string;
  status: string;
  permission: string;
  created_at: string;
  expires_at?: string | null;
  teams: {
    id: string;
    name: string;
    tag: string;
    logo_url: string | null;
  };
}

const PendingInvites = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchInvites();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData);
    } else {
      navigate("/auth");
    }
  };

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("team_invites")
        .select(`
          id,
          team_id,
          status,
          permission,
          created_at,
          expires_at,
          teams (
            id,
            name,
            tag,
            logo_url
          )
        `)
        .eq("invited_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvites(((data || []) as unknown) as TeamInvite[]);
    } catch (error: any) {
      toast.error("Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: TeamInvite) => {
    try {
      setActionLoading(invite.id);

      if (isExpiredInvite(invite)) {
        toast.error("Este convite expirou");
        return;
      }

      // Check if user already has a team
      const { data: existingTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existingTeam) {
        toast.error("Você já possui uma equipe. Exclua ou saia dela antes de aceitar outro convite.");
        return;
      }

      // Update invite status
      const { error: updateError } = await supabase
        .from("team_invites")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", invite.id);

      if (updateError) throw updateError;

      // Add player to team_members
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: invite.team_id,
          player_name: profile?.full_name || profile?.username || "Jogador",
          game_id: user.id,
          discord: profile?.discord_contact || "",
          function: invite.permission === "admin" ? "CAPITÃO" : "SUPORTE"
        });

      if (memberError) throw memberError;

      // Create notification for team owner
      const { data: team } = await supabase
        .from("teams")
        .select("owner_id, name")
        .eq("id", invite.team_id)
        .single();

      if (team) {
        await supabase
          .from("notifications")
          .insert(
            buildNotificationRow({
              user_id: team.owner_id,
              type: "invite_accepted",
              title: "Convite Aceito!",
              message: `${profile?.full_name || "Um jogador"} aceitou seu convite para ${team.name}`,
              related_id: invite.team_id,
            })
          );
      }

      toast.success("Convite aceito com sucesso!");
      fetchInvites();
    } catch (error: any) {
      toast.error(error.message || "Erro ao aceitar convite");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInvite = async (invite: TeamInvite) => {
    try {
      setActionLoading(invite.id);

      const { error } = await supabase
        .from("team_invites")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", invite.id);

      if (error) throw error;

      // Create notification for team owner
      const { data: team } = await supabase
        .from("teams")
        .select("owner_id, name")
        .eq("id", invite.team_id)
        .single();

      if (team) {
        await supabase
          .from("notifications")
          .insert(
            buildNotificationRow({
              user_id: team.owner_id,
              type: "invite_rejected",
              title: "Convite Recusado",
              message: `${profile?.full_name || "Um jogador"} recusou seu convite para ${team.name}`,
              related_id: invite.team_id,
            })
          );
      }

      toast.success("Convite recusado");
      fetchInvites();
    } catch (error: any) {
      toast.error(error.message || "Erro ao recusar convite");
    } finally {
      setActionLoading(null);
    }
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      member: "Membro",
      substitute: "Substituto"
    };
    return labels[permission] || permission;
  };

  const getPermissionIcon = (permission: string) => {
    if (permission === "admin") return <Shield className="w-4 h-4" />;
    return <UserPlus className="w-4 h-4" />;
  };

  const isExpiredInvite = (invite: TeamInvite) => {
    if (!invite.expires_at) return false;
    const dt = new Date(invite.expires_at);
    return !Number.isNaN(dt.getTime()) && dt.getTime() < Date.now();
  };

  const visibleInvites = useMemo(() => {
    if (showExpired) return invites;
    return invites.filter((i) => !isExpiredInvite(i));
  }, [invites, showExpired]);

  if (loading) {
    return (
      <MainLayout showFooter={false}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <main className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Header */}
        <div className="bg-primary/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Convites Pendentes</h1>
              <p className="text-muted-foreground">
                Gerencie os convites de equipes que você recebeu
              </p>
            </div>
          </div>
        </div>

        {/* Invites List */}
        {invites.length === 0 ? (
          <Card className="p-12 text-center bg-card/80">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum convite pendente</h3>
            <p className="text-muted-foreground">
              Quando você receber convites de equipes, eles aparecerão aqui.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={showExpired ? "secondary" : "outline"} className="text-[11px]">
                  {showExpired ? "Mostrando expirados" : "Ocultando expirados"}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowExpired((v) => !v)}
              >
                {showExpired ? "Ocultar expirados" : "Mostrar expirados"}
              </Button>
            </div>

            {visibleInvites.length === 0 ? (
              <Card className="p-12 text-center bg-card/80">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum convite ativo</h3>
                <p className="text-muted-foreground">
                  Seus convites pendentes ativos aparecerão aqui.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleInvites.map((invite) => {
                  const expired = isExpiredInvite(invite);
                  const acceptDisabled = expired || actionLoading === invite.id;

                  return (
              <Card key={invite.id} className="p-6 bg-card/80 border-border">
                <div className="flex items-start gap-4">
                  {/* Team Logo */}
                  {invite.teams?.logo_url ? (
                    <img
                      src={invite.teams.logo_url}
                      alt={invite.teams?.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                  )}

                  {/* Team Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg uppercase truncate">
                        {invite.teams?.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        [{invite.teams?.tag}]
                      </Badge>
                      {expired && (
                        <Badge variant="destructive" className="text-[11px]">
                          Expirado
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {getPermissionIcon(invite.permission)}
                      <span className="text-sm text-muted-foreground">
                        Convidado como: <span className="text-primary font-medium">{getPermissionLabel(invite.permission)}</span>
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4">
                      Recebido em {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                      {invite.expires_at && !isExpiredInvite(invite) && (
                        <>
                          {" "}· Expira em{" "}
                          {formatDistanceToNowStrict(new Date(invite.expires_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </>
                      )}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptInvite(invite)}
                        disabled={acceptDisabled}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === invite.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            {expired ? "Expirado" : "Aceitar"}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleRejectInvite(invite)}
                        disabled={actionLoading === invite.id}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Recusar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default PendingInvites;
