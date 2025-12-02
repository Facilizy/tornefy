import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExternalTeamDialogProps {
  trainingId: string;
  organizerId: string;
  onTeamCreated: () => void;
}

export function ExternalTeamDialog({ trainingId, organizerId, onTeamCreated }: ExternalTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState([
    { player_name: '', game_id: '', discord: '', function: 'RUSH' as 'RUSH' | 'SUPORTE' | 'CAPITÃO' },
  ]);

  const addMember = () => {
    if (members.length < 6) {
      setMembers([...members, { player_name: '', game_id: '', discord: '', function: 'RUSH' }]);
    }
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: string, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (members.length === 0 || !members[0].player_name) {
      toast.error('Adicione pelo menos um membro à equipe');
      return;
    }

    try {
      setLoading(true);

      // Criar equipe externa (sem owner_id)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          tag: '', // Sem TAG para times externos
          owner_id: organizerId, // temporariamente usar organizer como owner
          is_external: true,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Adicionar membros
      const membersData = members
        .filter(m => m.player_name.trim() !== '')
        .map(m => ({
          team_id: team.id,
          player_name: m.player_name,
          game_id: m.game_id,
          discord: m.discord,
          function: m.function,
        }));

      const { error: membersError } = await supabase
        .from('team_members')
        .insert(membersData);

      if (membersError) throw membersError;

      // Registrar equipe no treino
      const { error: regError } = await supabase
        .from('training_registrations')
        .insert({
          training_id: trainingId,
          team_id: team.id,
        });

      if (regError) throw regError;

      toast.success('Equipe externa criada e inscrita!');
      setOpen(false);
      setTeamName('');
      setMembers([{ player_name: '', game_id: '', discord: '', function: 'RUSH' }]);
      onTeamCreated();
    } catch (error: any) {
      console.error('Error creating external team:', error);
      toast.error(error.message || 'Erro ao criar equipe externa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Equipe Externa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Equipe Externa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="teamName">Nome da Equipe</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Nome da equipe externa"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Esta equipe não terá TAG e só existirá neste treino
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Membros da Equipe</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMember}
                disabled={members.length >= 6}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {members.map((member, index) => (
              <div key={index} className="space-y-2 p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Membro {index + 1}</span>
                  {members.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(index)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Nome do Jogador</Label>
                    <Input
                      value={member.player_name}
                      onChange={(e) => updateMember(index, 'player_name', e.target.value)}
                      placeholder="Nome"
                      required={index === 0}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ID do Jogo</Label>
                    <Input
                      value={member.game_id}
                      onChange={(e) => updateMember(index, 'game_id', e.target.value)}
                      placeholder="ID"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Discord</Label>
                    <Input
                      value={member.discord}
                      onChange={(e) => updateMember(index, 'discord', e.target.value)}
                      placeholder="@discord"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Função</Label>
                    <Select
                      value={member.function}
                      onValueChange={(value) => updateMember(index, 'function', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RUSH">RUSH</SelectItem>
                        <SelectItem value="SUPORTE">SUPORTE</SelectItem>
                        <SelectItem value="CAPITÃO">CAPITÃO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar e Inscrever'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
