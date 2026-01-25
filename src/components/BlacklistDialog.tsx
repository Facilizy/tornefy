import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Ban, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface BlacklistEntry {
  id: string;
  team_tag: string;
  reason: string | null;
  created_at: string;
}

export const BlacklistDialog = () => {
  const [open, setOpen] = useState(false);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    if (open) {
      fetchBlacklist();
    }
  }, [open]);

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("organizer_blacklist")
        .select("*")
        .eq("organizer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBlacklist(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar blacklist: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTag.trim()) {
      toast.error("Digite uma TAG");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("organizer_blacklist")
        .insert({
          organizer_id: user.id,
          team_tag: newTag.trim().toUpperCase(),
          reason: newReason.trim() || null,
        });

      if (error) throw error;
      
      toast.success("Equipe adicionada à blacklist");
      setNewTag("");
      setNewReason("");
      fetchBlacklist();
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("organizer_blacklist")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Equipe removida da blacklist");
      fetchBlacklist();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" className="w-full sm:w-auto justify-center">
          <Ban className="w-4 h-4" />
          Gerenciar Blacklist
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Blacklist de Equipes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tag">TAG da Equipe</Label>
              <Input
                id="tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value.toUpperCase())}
                placeholder="Ex: ABC"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Ex: Comportamento inadequado"
              />
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar à Blacklist
          </Button>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {loading ? (
            <div className="flex justify-center py-8">Carregando...</div>
          ) : blacklist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma equipe na blacklist
            </div>
          ) : (
            <div className="space-y-2">
              {blacklist.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <p className="font-medium">[{entry.team_tag}]</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.reason || "Sem motivo especificado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(entry.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
