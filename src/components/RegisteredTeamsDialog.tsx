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

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

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
        (registrations || []).map(async (reg) => {
          const teamTag = reg.teams.tag;

          // Count active blacklists from different organizers
          const { data: blacklistCount } = await supabase
            .rpc("count_active_blacklists_from_different_organizers", {
              _team_tag: teamTag
            });

          // Count reports from current organizer
          const { data: reports } = await supabase
            .from("team_reports")
            .select("id")
            .eq("organizer_id", user.id)
            .eq("team_tag", teamTag);

          return {
            id: reg.teams.id,
            name: reg.teams.name,
            tag: reg.teams.tag,
            logo_url: reg.teams.logo_url,
            members: reg.teams.team_members || [],
            blacklist_count: blacklistCount || 0,
            report_count: reports?.length || 0,
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
          <Button variant="outline" size="sm">
            <Users className="w-4 h-4 mr-2" />
            Ver Equipes
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Equipes Inscritas - {trainingName}</span>
              {teams.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAllInfo}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Tudo
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

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
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                {teams.map((team) => (
                  <Card key={team.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {team.logo_url ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-12 h-12 rounded-lg object-cover border-2 border-primary"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg uppercase">
                                {team.name}
                              </CardTitle>
                              {team.blacklist_count && team.blacklist_count >= 3 && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {team.blacklist_count} Blacklists
                                </Badge>
                              )}
                              {team.report_count && team.report_count > 0 && (
                                <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
                                  <Flag className="w-3 h-3" />
                                  {team.report_count} Denúncia{team.report_count > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="mt-1 uppercase">
                              {team.tag}
                            </Badge>
                          </div>
                        </div>
                         <div className="flex gap-2">
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
                          <div
                            key={index}
                            className="p-3 rounded-lg bg-accent/30 space-y-1"
                          >
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
