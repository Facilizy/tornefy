import MainLayout from "@/components/MainLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Users, Shield, UserPlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface SentInvite {
  id: string;
  invited_user_id: string | null;
  invited_username: string | null;
  is_external: string | null;
  external_player_name: string | null;
  external_discord: string | null;
  external_game_id: string | null;
  permission: string | null;
  status: string | null;
  created_at: string | null;
}

const SentInvites = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [invites, setInvites] = useState<SentInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTeamAndInvites();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const fetchTeamAndInvites = async () => {
    try {
      setLoading(true);

      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id, name, tag, logo_url")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (teamError) throw teamError;

      if (!teamData) {
        setTeam(null);
        setInvites([]);
        return;
      }

      setTeam(teamData);

      const { data: invitesData, error: invitesError } = await supabase
        .from("team_invites")
        .select("id, invited_user_id, invited_username, is_external, external_player_name, external_discord, external_game_id, permission, status, created_at")
        .eq("team_id", teamData.id)
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;

      setInvites((invitesData || []) as SentInvite[]);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar convites enviados");
    } finally {
      setLoading(false);
    }
  };

  const getPermissionLabel = (permission: string | null) => {
    if (!permission) return "Membro";
    const labels: Record<string, string> = {
      admin: "Administrador",
      member: "Membro",
      substitute: "Substituto",
    };
    return labels[permission] || permission;
  };

  const getPermissionIcon = (permission: string | null) => {
    if (permission === "admin") return <Shield className="w-4 h-4" />;
    return <UserPlus className="w-4 h-4" />;
  };

  const getStatusLabel = (status: string | null) => {
    if (!status || status === "pending") return "Pendente";
    if (status === "accepted") return "Aceito";
    if (status === "rejected") return "Recusado";
    return status;
  };

  const getStatusVariant = (status: string | null) => {
    if (!status || status === "pending") return "outline" as const;
    if (status === "accepted") return "default" as const;
    if (status === "rejected") return "destructive" as const;
    return "outline" as const;
  };

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

        <div className="bg-primary/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Convites Enviados</h1>
              <p className="text-muted-foreground">
                Veja todos os convites que sua equipe enviou para jogadores
              </p>
            </div>
          </div>
        </div>

        {!team ? (
          <Card className="p-12 text-center bg-card/80">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma equipe encontrada</h3>
            <p className="text-muted-foreground">
              Crie uma equipe primeiro para poder enviar e acompanhar convites.
            </p>
          </Card>
        ) : invites.length === 0 ? (
          <Card className="p-12 text-center bg-card/80">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum convite enviado</h3>
            <p className="text-muted-foreground">
              Assim que você enviar convites para jogadores, eles aparecerão aqui.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invites.map((invite) => (
              <Card key={invite.id} className="p-6 bg-card/80 border-border">
                <div className="flex items-start gap-4">
                  {/* Team logo or initials */}
                  {team?.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg uppercase truncate">
                        {invite.is_external === "true"
                          ? invite.external_player_name || "Jogador Externo"
                          : invite.invited_username
                            ? `@${invite.invited_username}`
                            : "Jogador"}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {team?.tag ? `[${team.tag}]` : "Equipe"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      {getPermissionIcon(invite.permission)}
                      <span>
                        Convite como: <span className="text-primary font-medium">{getPermissionLabel(invite.permission)}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">
                        Enviado em {invite.created_at ? new Date(invite.created_at).toLocaleDateString("pt-BR") : "-"}
                      </p>
                      <Badge variant={getStatusVariant(invite.status)} className="text-[11px]">
                        {getStatusLabel(invite.status)}
                      </Badge>
                    </div>

                    {invite.is_external === "true" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Externo · {invite.external_player_name || "Sem nome"}
                        {invite.external_discord && ` · Discord: ${invite.external_discord}`}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default SentInvites;
