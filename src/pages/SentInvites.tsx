import MainLayout from "@/components/MainLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Users, Shield, UserPlus, ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { buildNotificationRow } from "@/lib/notifications";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResendInviteConfirmDialog } from "@/components/invites/ResendInviteConfirmDialog";

const INVITE_TTL_DAYS = 7;
const INVITE_RESEND_COOLDOWN_MINUTES = 30;

const buildExpiresAt = () =>
  new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

interface SentInvite {
  id: string | null;
  invited_user_id: string | null;
  invited_username: string | null;
  /** Supabase table stores this as text ("true"/"false") */
  is_external: string | null;
  external_player_name: string | null;
  external_discord: string | null;
  external_game_id: string | null;
  permission: string | null;
  status: string | null;
  created_at: string | null;
  expires_at?: string | null;
}

const SentInvites = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [invites, setInvites] = useState<SentInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState<string | null>(null);

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
        .select(
          "id, invited_user_id, invited_username, is_external, external_player_name, external_discord, external_game_id, permission, status, created_at, expires_at"
        )
        .eq("team_id", teamData.id)
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;

      setInvites(((invitesData || []) as unknown) as SentInvite[]);
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

  const isExpiredInvite = (invite: SentInvite) => {
    if (!invite.expires_at) return false;
    const dt = new Date(invite.expires_at);
    return !Number.isNaN(dt.getTime()) && dt.getTime() < Date.now();
  };

  const getCooldownRemainingMinutes = (invite: SentInvite) => {
    if (!invite.created_at) return 0;
    const created = new Date(invite.created_at);
    if (Number.isNaN(created.getTime())) return 0;
    const ageMs = Date.now() - created.getTime();
    const cooldownMs = INVITE_RESEND_COOLDOWN_MINUTES * 60 * 1000;
    const remainingMs = cooldownMs - ageMs;
    if (remainingMs <= 0) return 0;
    return Math.ceil(remainingMs / (60 * 1000));
  };

  const handleResendInvite = async (invite: SentInvite) => {
    if (!team) return;

    if (invite.is_external === "true") {
      toast.error("Não é possível reenviar convite externo automaticamente");
      return;
    }
    if (!invite.invited_user_id) {
      toast.error("Convite sem usuário de destino");
      return;
    }

    // Legacy safeguard: some old rows can have NULL id (cannot update by id)
    const inviteId = invite.id ?? null;

    if (!invite.status || invite.status === "pending") {
      const remaining = getCooldownRemainingMinutes(invite);
      if (remaining > 0) {
        toast.error(`Aguarde ${remaining} min para reenviar`);
        return;
      }
    }

    try {
      setResendLoading(inviteId ?? "legacy");

      // Re-send should NOT create a new row (prevents duplicates and avoids unique-index conflicts).
      // Prefer updating the existing invite row. If it's a legacy row without id, create a fresh one.
      if (inviteId) {
        const { error: updateError } = await supabase
          .from("team_invites")
          .update({
            status: "pending",
            expires_at: buildExpiresAt(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", inviteId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("team_invites")
          .insert([
            {
              id: crypto.randomUUID(),
              team_id: team.id,
              invited_user_id: invite.invited_user_id,
              invited_username: invite.invited_username,
              is_external: "false",
              permission: invite.permission ?? "member",
              status: "pending",
              expires_at: buildExpiresAt(),
              updated_at: new Date().toISOString(),
            },
          ]);
        if (insertError) throw insertError;
      }

      await supabase.from("notifications").insert(
        buildNotificationRow({
          user_id: invite.invited_user_id,
          title: "Novo convite de equipe",
          message: team?.name && team?.tag
            ? `Você foi convidado para a equipe ${team.name} [${team.tag}]`
            : "Você recebeu um novo convite de equipe.",
          type: "team_invite",
          related_id: inviteId,
        })
      );

      toast.success("Convite reenviado");
      fetchTeamAndInvites();
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível reenviar o convite");
    } finally {
      setResendLoading(null);
    }
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
            {invites.map((invite) => {
              const inviteKey = invite.id ?? `${invite.invited_user_id ?? "unknown"}-${invite.created_at ?? ""}`;
              const inviteLoadingKey = invite.id ?? "legacy";

              return (
              <Card key={inviteKey} className="p-6 bg-card/80 border-border">
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
                        {invite.expires_at && (!invite.status || invite.status === "pending") && !isExpiredInvite(invite) && (
                          <>
                            {" "}· Expira em{" "}
                            {formatDistanceToNowStrict(new Date(invite.expires_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        {isExpiredInvite(invite) && (!invite.status || invite.status === "pending") ? (
                          <Badge variant="destructive" className="text-[11px]">
                            Expirado
                          </Badge>
                        ) : (
                          <Badge variant={getStatusVariant(invite.status)} className="text-[11px]">
                            {getStatusLabel(invite.status)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {((!invite.status || invite.status === "pending") || invite.status === "rejected" || isExpiredInvite(invite)) &&
                      invite.is_external !== "true" && (
                      <div className="mt-3">
                        {(() => {
                          const remaining = (!invite.status || invite.status === "pending")
                            ? getCooldownRemainingMinutes(invite)
                            : 0;
                          const disabled = resendLoading === inviteLoadingKey || remaining > 0;

                          const targetLabel = invite.invited_username
                            ? `@${invite.invited_username}`
                            : "jogador";
                          const messagePreview = team?.name && team?.tag
                            ? `Você foi convidado para a equipe ${team.name} [${team.tag}]`
                            : "Você recebeu um novo convite de equipe.";

                          return (
                            <ResendInviteConfirmDialog
                              targetLabel={targetLabel}
                              messagePreview={messagePreview}
                              onConfirm={() => handleResendInvite(invite)}
                                confirmLabel={resendLoading === inviteLoadingKey ? "Enviando..." : "Reenviar"}
                              trigger={
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={disabled}
                                >
                                    {resendLoading === inviteLoadingKey ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      {remaining > 0
                                        ? `Reenviar em ${remaining} min`
                                        : "Reenviar convite"}
                                    </>
                                  )}
                                </Button>
                              }
                            />
                          );
                        })()}
                      </div>
                    )}

                    {invite.is_external === "true" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Externo · {invite.external_player_name || "Sem nome"}
                        {invite.external_discord && ` · Discord: ${invite.external_discord}`}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default SentInvites;
