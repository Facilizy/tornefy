import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Loader2,
  Send,
  User,
  UserCheck,
  Clock,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { buildNotificationRow } from "@/lib/notifications";

const INVITE_TTL_DAYS = 7;
const buildExpiresAt = () =>
  new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

interface TeamInviteDialogProps {
  teamId: string;
  onInviteSent?: () => void;
}

interface UserResult {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface Invite {
  id: string;
  invited_user_id: string | null;
  invited_username: string | null;
  /** Supabase table stores this as text ("true"/"false") */
  is_external: string | null;
  external_player_name: string | null;
  external_discord: string | null;
  external_game_id: string | null;
  permission: string;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export const TeamInviteDialog = ({ teamId, onInviteSent }: TeamInviteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState("member");

  const [teamInfo, setTeamInfo] = useState<{ name: string; tag: string } | null>(null);

  // External player form
  const [externalForm, setExternalForm] = useState({
    player_name: "",
    discord: "",
    game_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchInvites();
      fetchTeamInfo();
    }
  }, [open, teamId]);

  const fetchTeamInfo = async () => {
    try {
      const { data } = await supabase
        .from("teams")
        .select("name, tag")
        .eq("id", teamId)
        .maybeSingle();

      if (data) {
        setTeamInfo({ name: data.name || "Equipe", tag: data.tag || "" });
      }
    } catch (error) {
      console.error("Error fetching team info:", error);
    }
  };

  const fetchInvites = async () => {
    try {
      setLoadingInvites(true);
      const { data, error } = await supabase
        .from("team_invites")
        .select(`
          *,
          profiles:invited_user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvites((data as any[]) || []);
    } catch (error) {
      console.error("Error fetching invites:", error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const searchUsers = async () => {
    if (searchTerm.length < 2) {
      toast.error("Digite pelo menos 2 caracteres");
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Erro ao buscar usuários");
    } finally {
      setSearching(false);
    }
  };

  const sendInvite = async (userId: string, username: string) => {
    try {
      setSending(true);

      // Check if already invited
      const existing = invites.find(
        (inv) => inv.invited_user_id === userId && inv.status === "pending"
      );
      if (existing) {
        toast.error("Este jogador já foi convidado");
        return;
      }

      const { data: inserted, error } = await supabase
        .from("team_invites")
        .insert([
          {
            team_id: teamId,
            invited_user_id: userId,
            invited_username: username,
            is_external: "false",
            permission: selectedPermission,
            status: "pending",
            expires_at: buildExpiresAt(),
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      // Create notification for invited user
      await supabase
        .from("notifications")
        .insert(
          buildNotificationRow({
            user_id: userId,
            title: "Novo convite de equipe",
            message: teamInfo
              ? `Você foi convidado para a equipe ${teamInfo.name} [${teamInfo.tag}]`
              : "Você recebeu um novo convite de equipe.",
            type: "team_invite",
            related_id: inserted.id,
          })
        );
      toast.success(`Convite enviado para @${username}`);
      fetchInvites();
      setSearchTerm("");
      setSearchResults([]);
      onInviteSent?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar convite");
    } finally {
      setSending(false);
    }
  };

  const addExternalPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalForm.player_name.trim()) {
      toast.error("Nome do jogador é obrigatório");
      return;
    }

    try {
      setSending(true);
      const { error } = await supabase.from("team_invites").insert([
        {
          team_id: teamId,
          is_external: "true",
          external_player_name: externalForm.player_name,
          external_discord: externalForm.discord || null,
          external_game_id: externalForm.game_id || null,
          permission: selectedPermission,
          status: "accepted", // External players are auto-accepted
          expires_at: buildExpiresAt(),
        },
      ]);

      if (error) throw error;
      toast.success("Jogador externo adicionado");
      setExternalForm({ player_name: "", discord: "", game_id: "" });
      fetchInvites();
      onInviteSent?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar jogador");
    } finally {
      setSending(false);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("team_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
      toast.success("Convite removido");
      fetchInvites();
    } catch (error) {
      toast.error("Erro ao remover convite");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            Aceito
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <X className="w-3 h-3 mr-1" />
            Recusado
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case "admin":
        return "Admin";
      case "member":
        return "Membro";
      case "substitute":
        return "Reserva";
      default:
        return permission;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Gerenciar Convites
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="external">Externo</TabsTrigger>
            <TabsTrigger value="invites">
              Convites ({invites.length})
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div>
              <Label>Permissão do Membro</Label>
              <Select
                value={selectedPermission}
                onValueChange={setSelectedPermission}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="substitute">Reserva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por @username ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  className="pl-10"
                />
              </div>
              <Button onClick={searchUsers} disabled={searching}>
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <Card
                    key={user.id}
                    className="p-3 bg-background/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 m-auto mt-2.5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        {user.username && (
                          <p className="text-sm text-muted-foreground">
                            @{user.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendInvite(user.id, user.username || user.full_name)}
                      disabled={sending}
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Convidar
                        </>
                      )}
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchTerm && !searching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum usuário encontrado
              </p>
            )}
          </TabsContent>

          {/* External Tab */}
          <TabsContent value="external" className="mt-4">
            <form onSubmit={addExternalPlayer} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicione jogadores que não possuem conta na plataforma
              </p>

              <div>
                <Label>Permissão</Label>
                <Select
                  value={selectedPermission}
                  onValueChange={setSelectedPermission}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="substitute">Reserva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ext_name">Nome do Jogador *</Label>
                <Input
                  id="ext_name"
                  value={externalForm.player_name}
                  onChange={(e) =>
                    setExternalForm({ ...externalForm, player_name: e.target.value })
                  }
                  placeholder="Nome ou nickname"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ext_discord">Discord</Label>
                <Input
                  id="ext_discord"
                  value={externalForm.discord}
                  onChange={(e) =>
                    setExternalForm({ ...externalForm, discord: e.target.value })
                  }
                  placeholder="usuario#1234"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="ext_game_id">ID no Jogo</Label>
                <Input
                  id="ext_game_id"
                  value={externalForm.game_id}
                  onChange={(e) =>
                    setExternalForm({ ...externalForm, game_id: e.target.value })
                  }
                  placeholder="ID ou UID do jogador"
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Adicionar Jogador Externo
              </Button>
            </form>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="mt-4">
            {loadingInvites ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : invites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum convite enviado
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {invites.map((invite) => (
                  <Card
                    key={invite.id}
                    className="p-3 bg-background/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {invite.is_external ? (
                          <User className="w-5 h-5 text-muted-foreground" />
                        ) : invite.profiles?.avatar_url ? (
                          <img
                            src={invite.profiles.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCheck className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {invite.is_external
                            ? invite.external_player_name
                            : invite.profiles?.full_name || invite.invited_username}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getPermissionLabel(invite.permission)}
                          </Badge>
                          {invite.is_external && (
                            <Badge variant="secondary" className="text-xs">
                              Externo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(invite.status)}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:text-destructive"
                        onClick={() => deleteInvite(invite.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TeamInviteDialog;
