import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Download, Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

interface TeamMember {
  player_name: string;
  game_id: string;
  discord: string;
  function: string;
}

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
  members: TeamMember[];
}

export function TournamentRegisteredTeamsDialog({
  tournamentId,
  tournamentName,
  canManage,
}: {
  tournamentId: string;
  tournamentName: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tournamentId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: registrations, error } = await (supabase as any)
        .from("tournament_registrations")
        .select(
          `
          team_id,
          status,
          teams (
            id,
            name,
            tag,
            logo_url,
            team_members (
              player_name,
              game_id,
              discord,
              function
            )
          )
        `
        )
        .eq("tournament_id", tournamentId);

      if (error) throw error;

      const rows = (registrations || [])
        .filter((r: any) => r?.teams?.id)
        .map((r: any) => {
          const t = r.teams as any;
          return {
            id: String(t.id),
            name: String(t.name ?? "Equipe"),
            tag: String(t.tag ?? ""),
            logo_url: t.logo_url ?? undefined,
            members: (t.team_members || []) as TeamMember[],
          } satisfies Team;
        });

      setTeams(rows);
    } catch (error) {
      console.error("Error fetching tournament teams:", error);
      toast.error("Erro ao carregar equipes");
    } finally {
      setLoading(false);
    }
  };

  const copyTeamInfo = (team: Team) => {
    let text = `🎮 EQUIPE: ${team.name} [${team.tag}]\n\n`;
    text += `👥 MEMBROS:\n`;
    team.members.forEach((member, index) => {
      text += `${index + 1}. ${member.player_name}\n`;
      text += `   • Função: ${member.function}\n`;
      text += `   • ID: ${member.game_id}\n`;
      text += `   • Discord: ${member.discord}\n\n`;
    });

    navigator.clipboard.writeText(text);
    toast.success("Informações copiadas!");
  };

  const downloadAllInfo = () => {
    let text = `📋 TORNEIO: ${tournamentName}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    teams.forEach((team, teamIndex) => {
      text += `🎮 EQUIPE ${teamIndex + 1}: ${team.name} [${team.tag}]\n\n`;
      text += `👥 MEMBROS:\n`;
      team.members.forEach((member, memberIndex) => {
        text += `${memberIndex + 1}. ${member.player_name}\n`;
        text += `   • Função: ${member.function}\n`;
        text += `   • ID: ${member.game_id}\n`;
        text += `   • Discord: ${member.discord}\n\n`;
      });
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    });

    const blob = new Blob([text], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournamentName}_equipes.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Informações baixadas!");
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!canManage) return;
    if (!confirm("Deseja realmente remover esta equipe do torneio?")) return;

    try {
      const { error } = await (supabase as any)
        .from("tournament_registrations")
        .delete()
        .eq("tournament_id", tournamentId)
        .eq("team_id", teamId);

      if (error) throw error;

      toast.success("Equipe removida do torneio!");
      await fetchTeams();
    } catch (error) {
      console.error("Error removing team:", error);
      toast.error("Erro ao remover equipe");
    }
  };

  const totalMembers = useMemo(
    () => teams.reduce((acc, t) => acc + (t.members?.length ?? 0), 0),
    [teams]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="justify-center gap-2">
          <Users className="w-4 h-4" />
          Times inscritos
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="border-b border-border bg-card/60 backdrop-blur">
          <DialogHeader className="p-4 sm:p-5">
            <DialogTitle className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Equipes inscritas</p>
                <span className="block text-base sm:text-lg font-black uppercase tracking-tight truncate">
                  {tournamentName}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {teams.length} equipe{teams.length !== 1 ? "s" : ""} • {totalMembers} jogador
                  {totalMembers !== 1 ? "es" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {teams.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={downloadAllInfo}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar tudo
                  </Button>
                ) : null}
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma equipe inscrita ainda</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[75vh]">
            <div className="p-4 sm:p-5 space-y-4">
              {teams.map((team) => (
                <Card key={team.id} className="overflow-hidden bg-card/60 border-border">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="w-12 h-12 rounded-xl object-cover border border-border bg-background/40"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-border bg-background/40 grid place-items-center">
                            <DefaultAvatarMark className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg uppercase truncate">{team.name}</CardTitle>
                          </div>

                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="uppercase">
                              {team.tag || "TIME"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:justify-end">
                        {canManage ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveTeam(team.id)}
                            title="Remover equipe do torneio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={() => copyTeamInfo(team)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                        Membros ({team.members.length})
                      </h4>
                      {team.members.map((member, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-xl border border-border bg-background/30 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{member.player_name}</p>
                            <Badge variant="outline">{member.function}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">ID: {member.game_id}</p>
                          <p className="text-sm text-muted-foreground">Discord: {member.discord}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
