import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Download, Copy, Loader2, AlertTriangle, Flag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ReportTeamDialog } from './ReportTeamDialog';
import { fetchVerifiedMap } from '@/hooks/useVerifiedEntities';
import { TeamVerifiedBadge } from '@/components/TeamVerifiedBadge';
import { DefaultAvatarMark } from '@/components/DefaultAvatarMark';
import { ExternalTeamsJsonImportDialog } from "@/components/external-teams/ExternalTeamsJsonImportDialog";

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
  blacklist_count?: number;
  report_count?: number;
  is_external?: boolean;
}

interface RegisteredTeamsDialogProps {
  trainingId: string;
  trainingName: string;
}

export function RegisteredTeamsDialog({ trainingId, trainingName }: RegisteredTeamsDialogProps) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [verifiedMap, setVerifiedMap] = useState<Map<string, boolean>>(new Map());
  const [canImportExternal, setCanImportExternal] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return setCanImportExternal(false);
        const { data: training } = await supabase
          .from("trainings")
          .select("organizer_id")
          .eq("id", trainingId)
          .maybeSingle();
        setCanImportExternal(String(training?.organizer_id ?? "") === String(user.id));
      } catch {
        setCanImportExternal(false);
      }
    })();
  }, [open, trainingId]);

  useEffect(() => {
    const ids = teams.map((t) => t.id).filter(Boolean);
    void (async () => {
      const map = await fetchVerifiedMap('team', ids);
      setVerifiedMap(map);
    })();
  }, [teams]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: registrations, error } = await supabase
        .from('training_registrations')
        .select(`
          team_id,
          teams (
            id,
            name,
            tag,
            logo_url,
            is_external,
            team_members (
              player_name,
              game_id,
              discord,
              function
            )
          )
        `)
        .eq('training_id', trainingId);

      if (error) throw error;

      // Fetch blacklist count and report count for each team
      const teamsWithStats = await Promise.all(
        (registrations || []).map(async (reg: any) => {
          const team = reg.teams as any;
          const teamTag = team.tag;

          // Count active blacklists from different organizers
          const { data: blacklistCount } = await (supabase as any)
            .rpc("count_active_blacklists_from_different_organizers", {
              _team_tag: teamTag,
            });

          // Count reports from current organizer
          const { data: reports } = await supabase
            .from("team_reports")
            .select("id")
            .eq("organizer_id", user.id)
            .eq("team_tag", teamTag);

          return {
            id: team.id,
            name: team.name,
            tag: team.tag,
            logo_url: team.logo_url,
            members: team.team_members || [],
            blacklist_count: blacklistCount || 0,
            report_count: reports?.length || 0,
            is_external: team.is_external || false,
          };
        })
      );

      setTeams(teamsWithStats);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Erro ao carregar equipes');
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
    toast.success('Informações copiadas!');
  };

  const downloadTeamLogo = async (team: Team) => {
    if (!team.logo_url) {
      toast.error('Esta equipe não possui logo');
      return;
    }

    try {
      const response = await fetch(team.logo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${team.tag}_logo.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Logo baixada!');
    } catch (error) {
      console.error('Error downloading logo:', error);
      toast.error('Erro ao baixar logo');
    }
  };

  const downloadAllInfo = () => {
    let text = `📋 TREINO: ${trainingName}\n`;
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

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trainingName}_equipes.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Informações baixadas!');
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!confirm("Deseja realmente remover esta equipe do treino?")) return;

    try {
      const { error } = await supabase
        .from('training_registrations')
        .delete()
        .eq('training_id', trainingId)
        .eq('team_id', teamId);

      if (error) throw error;
      
      toast.success('Equipe removida do treino!');
      fetchTeams();
    } catch (error) {
      console.error('Error removing team:', error);
      toast.error('Erro ao remover equipe');
    }
  };

  const getFunctionBadgeVariant = (func: string) => {
    switch (func) {
      case 'Suporte':
        return 'secondary';
      case 'Rifler':
        return 'default';
      case 'Atirador':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="xs" className="w-full justify-center gap-2">
            <Users className="w-4 h-4" />
            Ver Equipes
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <div className="border-b border-border bg-card/60 backdrop-blur">
            <DialogHeader className="p-4 sm:p-5">
              <DialogTitle className="flex items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Equipes inscritas</p>
                  <span className="block text-base sm:text-lg font-black uppercase tracking-tight truncate">
                    {trainingName}
                  </span>
                </div>
                 <div className="flex items-center gap-2 shrink-0">
                   {canImportExternal ? (
                     <ExternalTeamsJsonImportDialog trainingId={trainingId} onCreated={fetchTeams} />
                   ) : null}
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
              <p className="text-muted-foreground">
                Nenhuma equipe inscrita ainda
              </p>
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
                              <CardTitle className="text-lg uppercase truncate">
                                {team.name}
                              </CardTitle>
                              {verifiedMap.get(team.id) ? <TeamVerifiedBadge variant="icon" size="sm" /> : null}
                              {team.is_external && (
                                <Badge variant="outline" className="gap-1">
                                  <Users className="w-3 h-3" />
                                  Convidado
                                </Badge>
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="uppercase">
                                {team.tag || 'CONVIDADO'}
                              </Badge>
                              {team.blacklist_count && team.blacklist_count >= 3 ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {team.blacklist_count} blacklists
                                </Badge>
                              ) : null}
                              {team.report_count && team.report_count > 0 ? (
                                <Badge variant="outline" className="gap-1">
                                  <Flag className="w-3 h-3" />
                                  {team.report_count} denúncia{team.report_count > 1 ? 's' : ''}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 sm:justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveTeam(team.id)}
                            title="Remover equipe do treino"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTeam(team);
                              setReportDialogOpen(true);
                            }}
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                          {team.logo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadTeamLogo(team)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyTeamInfo(team)}
                          >
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
                          <div key={index} className="p-3 rounded-xl border border-border bg-background/30 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{member.player_name}</p>
                              <Badge variant={getFunctionBadgeVariant(member.function)}>
                                {member.function}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ID: {member.game_id}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Discord: {member.discord}
                            </p>
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

      {selectedTeam && (
        <ReportTeamDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          trainingId={trainingId}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          teamTag={selectedTeam.tag}
          onReportSuccess={() => {
            fetchTeams();
          }}
        />
      )}
    </>
  );
}
