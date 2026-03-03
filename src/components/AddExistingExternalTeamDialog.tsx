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
import { Input } from '@/components/ui/input';
import { Search, Loader2, UserPlus } from 'lucide-react';
import { ActionTile } from "@/components/ActionTile";
import { toast } from 'sonner';

interface ExternalTeam {
  id: string;
  name: string;
  tag: string;
  members: { player_name: string }[];
}

interface AddExistingExternalTeamDialogProps {
  trainingId: string;
  organizerId: string;
  onTeamAdded: () => void;
  triggerVariant?: "button" | "tile";
}

export function AddExistingExternalTeamDialog({
  trainingId,
  organizerId,
  onTeamAdded,
  triggerVariant = "button",
}: AddExistingExternalTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState<ExternalTeam[]>([]);
  const [registeredTeamIds, setRegisteredTeamIds] = useState<string[]>([]);
  const [addingTeamId, setAddingTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchExternalTeams();
      fetchRegisteredTeams();
    }
  }, [open, organizerId]);

  const fetchExternalTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          tag,
          team_members (player_name)
        `)
        .eq('owner_id', organizerId)
        .eq('is_external', true)
        .order('name');

      if (error) throw error;

      const formattedTeams = data?.map((team) => ({
        id: team.id,
        name: team.name,
        tag: team.tag,
        members: team.team_members || [],
      })) || [];

      setTeams(formattedTeams);
    } catch (error: any) {
      console.error('Error fetching external teams:', error);
      toast.error('Erro ao buscar equipes externas');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('training_registrations')
        .select('team_id')
        .eq('training_id', trainingId);

      if (error) throw error;

      setRegisteredTeamIds(data?.map((r) => r.team_id) || []);
    } catch (error) {
      console.error('Error fetching registered teams:', error);
    }
  };

  const handleAddTeam = async (teamId: string) => {
    try {
      setAddingTeamId(teamId);

      // Find the next available slot number
      const { data: existingRegistrations } = await supabase
        .from("training_registrations")
        .select("slot_number")
        .eq("training_id", trainingId)
        .order("slot_number", { ascending: true });

      let nextSlot = 1;
      if (existingRegistrations && existingRegistrations.length > 0) {
        const usedSlots = existingRegistrations
          .map(r => r.slot_number)
          .filter(s => s !== null)
          .sort((a, b) => (a || 0) - (b || 0));
        
        for (let i = 1; i <= 100; i++) {
          if (!usedSlots.includes(i)) {
            nextSlot = i;
            break;
          }
        }
      }

      const { error } = await supabase
        .from('training_registrations')
        .insert({
          id: crypto.randomUUID(),
          training_id: trainingId,
          team_id: teamId,
          slot_number: nextSlot,
        });

      if (error) throw error;

      toast.success(`Equipe adicionada ao treino! Slot ${nextSlot}`);
      setRegisteredTeamIds([...registeredTeamIds, teamId]);
      onTeamAdded();
    } catch (error: any) {
      console.error('Error adding team:', error);
      toast.error(error.message || 'Erro ao adicionar equipe');
    } finally {
      setAddingTeamId(null);
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableTeams = filteredTeams.filter(
    (team) => !registeredTeamIds.includes(team.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "tile" ? (
          <ActionTile
            title="Buscar equipe externa"
            description="Inscreva um time convidado que já existe."
            icon={UserPlus}
          />
        ) : (
          <Button variant="outline" size="sm" className="w-full justify-center gap-2">
            <UserPlus className="w-4 h-4" />
            Buscar Equipe Externa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Equipe Externa Existente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da equipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : availableTeams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'Nenhuma equipe encontrada com esse nome'
                : 'Nenhuma equipe externa disponível'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {availableTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium uppercase">{team.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="uppercase">[{team.tag || 'CONVIDADO'}]</span>
                      <span>•</span>
                      <span>{team.members.length} membro(s)</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddTeam(team.id)}
                    disabled={addingTeamId === team.id}
                  >
                    {addingTeamId === team.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Adicionar'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
