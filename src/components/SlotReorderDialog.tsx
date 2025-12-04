import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Loader2, Save, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Team {
  registration_id: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  logo_url?: string;
  slot_number: number | null;
  is_external?: boolean;
}

interface SlotReorderDialogProps {
  trainingId: string;
  onSlotsUpdated: () => void;
}

export function SlotReorderDialog({ trainingId, onSlotsUpdated }: SlotReorderDialogProps) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_registrations")
        .select(`
          id,
          slot_number,
          team_id,
          teams (
            id,
            name,
            tag,
            logo_url,
            is_external
          )
        `)
        .eq("training_id", trainingId)
        .order("slot_number", { ascending: true });

      if (error) throw error;

      const formattedTeams: Team[] = (data || []).map((reg: any) => ({
        registration_id: reg.id,
        team_id: reg.teams.id,
        team_name: reg.teams.name,
        team_tag: reg.teams.tag,
        logo_url: reg.teams.logo_url,
        slot_number: reg.slot_number,
        is_external: reg.teams.is_external,
      }));

      setTeams(formattedTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Erro ao carregar equipes");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotChange = (registrationId: string, newSlot: number) => {
    setTeams(teams.map(team => 
      team.registration_id === registrationId 
        ? { ...team, slot_number: newSlot }
        : team
    ));
  };

  const handleSave = async () => {
    // Check for duplicate slots
    const slots = teams.map(t => t.slot_number).filter(s => s !== null);
    const duplicates = slots.filter((item, index) => slots.indexOf(item) !== index);
    
    if (duplicates.length > 0) {
      toast.error(`Slots duplicados detectados: ${duplicates.join(", ")}. Cada equipe deve ter um slot único.`);
      return;
    }

    try {
      setSaving(true);

      // Update each registration's slot_number
      for (const team of teams) {
        const { error } = await supabase
          .from("training_registrations")
          .update({ slot_number: team.slot_number })
          .eq("id", team.registration_id);

        if (error) throw error;
      }

      toast.success("Slots atualizados com sucesso!");
      onSlotsUpdated();
      setOpen(false);
    } catch (error) {
      console.error("Error saving slots:", error);
      toast.error("Erro ao salvar slots");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <ArrowUpDown className="w-4 h-4" />
          Reorganizar Slots
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Reorganizar Slots das Equipes
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma equipe inscrita</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3">
                {teams.map((team) => (
                  <div
                    key={team.registration_id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border"
                  >
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.team_name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate uppercase">
                          {team.team_name}
                        </p>
                        {team.is_external && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Convidado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground uppercase">
                        [{team.team_tag}]
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Slot:</span>
                      <Input
                        type="number"
                        min="1"
                        value={team.slot_number || ""}
                        onChange={(e) =>
                          handleSlotChange(team.registration_id, parseInt(e.target.value) || 0)
                        }
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
