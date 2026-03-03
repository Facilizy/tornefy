import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock, Plus, RefreshCcw, Trash2 } from "lucide-react";

export type ScrimRegistrationRow = {
  id: string;
  training_id: string;
  team_id: string;
  line_id: string | null;
  paid_amount_coins: number;
  registered_at: string;
  slot_number: number | null;
  teams?: {
    id: string;
    name: string | null;
    tag: string | null;
    logo_url: string | null;
  } | null;
};

export type ScrimGroupRow = {
  id: string;
  training_id: string;
  name: string;
  sort_order: number;
  locked: boolean;
  created_at: string;
};

export type ScrimGroupTeamRow = {
  id: string;
  group_id: string;
  team_id: string;
  seed: number | null;
  created_at: string;
  teams?: {
    id: string;
    name: string | null;
    tag: string | null;
    logo_url: string | null;
  } | null;
};

export function ScrimGroupsManager({
  trainingId,
  canManage,
  registrations,
}: {
  trainingId: string;
  canManage: boolean;
  registrations: ScrimRegistrationRow[];
}) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ScrimGroupRow[]>([]);
  const [groupTeams, setGroupTeams] = useState<ScrimGroupTeamRow[]>([]);

  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const teamsById = useMemo(() => {
    const map = new Map<string, ScrimRegistrationRow["teams"]>();
    for (const r of registrations) {
      if (r.team_id) map.set(String(r.team_id), (r.teams ?? null) as any);
    }
    return map;
  }, [registrations]);

  const groupById = useMemo(() => {
    return new Map(groups.map((g) => [String(g.id), g] as const));
  }, [groups]);

  const teamAlreadyInAnyGroup = useMemo(() => {
    const set = new Set(groupTeams.map((gt) => String(gt.team_id)));
    return set;
  }, [groupTeams]);

  const unassignedTeams = useMemo(() => {
    return registrations.filter((r) => !teamAlreadyInAnyGroup.has(String(r.team_id)));
  }, [registrations, teamAlreadyInAnyGroup]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const gRes = await supabase
        .from("scrim_groups")
        .select("*")
        .eq("training_id", trainingId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (gRes.error) throw gRes.error;

      const nextGroups = (gRes.data || []) as ScrimGroupRow[];
      setGroups(nextGroups);

      const groupIds = nextGroups.map((g) => String(g.id));
      if (groupIds.length === 0) {
        setGroupTeams([]);
        setSelectedGroupId("");
        return;
      }

      // Read-only mode must still be able to see teams; fetch teams via FK
      const gtRes = await supabase
        .from("scrim_group_teams")
        .select(
          `
          id,
          group_id,
          team_id,
          seed,
          created_at,
          teams (
            id,
            name,
            tag,
            logo_url
          )
        `
        )
        .in("group_id", groupIds)
        .order("created_at", { ascending: true });

      if (gtRes.error) throw gtRes.error;

      // Keep compatibility: when teams relation isn't returned, fallback to registrations map
      const enriched = (gtRes.data || []).map((row: any) => ({
        ...row,
        teams: row.teams ?? (teamsById.get(String(row.team_id)) ?? null),
      })) as ScrimGroupTeamRow[];

      setGroupTeams(enriched);

      if (!selectedGroupId && nextGroups.length > 0) {
        setSelectedGroupId(String(nextGroups[0].id));
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  }, [trainingId, selectedGroupId, teamsById]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const createGroup = async () => {
    if (!canManage) return;
    try {
      const name = newGroupName.trim();
      if (!name) {
        toast.error("Informe o nome do grupo");
        return;
      }

      const nextOrder = groups.length === 0 ? 0 : Math.max(...groups.map((g) => g.sort_order)) + 1;

      const { error } = await supabase.from("scrim_groups").insert({
        training_id: trainingId,
        name,
        sort_order: nextOrder,
        locked: false,
      });

      if (error) throw error;

      setNewGroupName("");
      toast.success("Grupo criado!");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar grupo");
    }
  };

  const toggleLock = async (groupId: string, locked: boolean) => {
    if (!canManage) return;
    try {
      const { error } = await supabase.from("scrim_groups").update({ locked }).eq("id", groupId);
      if (error) throw error;
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar grupo");
    }
  };

  const assignTeam = async () => {
    if (!canManage) return;
    try {
      if (!selectedGroupId) {
        toast.error("Selecione um grupo");
        return;
      }
      if (!selectedTeamId) {
        toast.error("Selecione uma equipe");
        return;
      }

      const g = groupById.get(String(selectedGroupId));
      if (g?.locked) {
        toast.error("Grupo travado. Destrave para alterar.");
        return;
      }

      if (teamAlreadyInAnyGroup.has(String(selectedTeamId))) {
        toast.error("Essa equipe já está em um grupo.");
        return;
      }

      const { error } = await supabase
        .from("scrim_group_teams")
        .insert({ group_id: selectedGroupId, team_id: selectedTeamId });
      if (error) throw error;

      setSelectedTeamId("");
      toast.success("Equipe adicionada ao grupo!");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao alocar equipe");
    }
  };

  const removeTeam = async (rowId: string, groupId: string) => {
    if (!canManage) return;
    try {
      const g = groupById.get(String(groupId));
      if (g?.locked) {
        toast.error("Grupo travado. Destrave para alterar.");
        return;
      }

      const { error } = await supabase.from("scrim_group_teams").delete().eq("id", rowId);
      if (error) throw error;

      toast.success("Equipe removida do grupo");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover equipe");
    }
  };

  return (
    <Card className="p-5 bg-card/50 border-border">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-black uppercase tracking-wide">Grupos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage
              ? "Crie grupos e adicione equipes inscritas neste scrim."
              : "Veja os grupos e quais equipes estão em cada grupo."}
          </p>
        </div>

        <Button variant="outline" onClick={fetchAll} className="gap-2" disabled={loading} type="button">
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Separator className="my-4" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando grupos…
        </div>
      ) : (
        <div className="space-y-6">
          {canManage && (
            <>
              {/* Create group */}
              <div className="rounded-xl border border-border bg-background/30 p-4">
                <p className="text-sm font-semibold">Criar grupo</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Label htmlFor="new-scrim-group" className="sr-only">
                      Nome do grupo
                    </Label>
                    <Input
                      id="new-scrim-group"
                      placeholder="ex: Grupo A"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="bg-background/40"
                    />
                  </div>
                  <Button type="button" onClick={createGroup} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar
                  </Button>
                </div>
              </div>

              {/* Assign team */}
              <div className="rounded-xl border border-border bg-background/30 p-4">
                <p className="text-sm font-semibold">Adicionar equipe ao grupo</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <Label>Grupo</Label>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger className="bg-background/40">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>
                            {g.name} {g.locked ? "(travado)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Equipe (inscrita e sem grupo)</Label>
                    <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                      <SelectTrigger className="bg-background/40">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedTeams.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            Nenhuma equipe disponível
                          </SelectItem>
                        ) : (
                          unassignedTeams.map((r) => {
                            const t = r.teams;
                            const label = t?.name || t?.tag || r.team_id;
                            return (
                              <SelectItem key={r.team_id} value={String(r.team_id)}>
                                {label}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    <Trash2 className="h-3 w-3" />
                    {unassignedTeams.length} sem grupo
                  </Badge>
                  <Button type="button" onClick={assignTeam} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Groups list */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {groups.length === 0 ? (
              <Card className="p-4 bg-background/30 border-border">
                <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
              </Card>
            ) : (
              groups.map((g) => {
                const teams = groupTeams.filter((gt) => String(gt.group_id) === String(g.id));
                return (
                  <Card key={g.id} className="p-4 bg-background/30 border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold uppercase truncate">{g.name}</p>
                          {g.locked ? (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" /> Travado
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{teams.length} equipe(s)</p>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Travar</span>
                            <Switch
                              checked={!!g.locked}
                              onCheckedChange={(v) => toggleLock(String(g.id), !!v)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="my-3" />

                    {teams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem equipes neste grupo.</p>
                    ) : (
                      <div className="space-y-2">
                        {teams.map((gt) => {
                          const t = gt.teams;
                          return (
                            <div
                              key={gt.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {t?.name || t?.tag || gt.team_id}
                                </p>
                                {t?.tag ? (
                                  <p className="text-xs text-muted-foreground truncate">@{t.tag}</p>
                                ) : null}
                              </div>
                              {canManage && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeTeam(String(gt.id), String(gt.group_id))}
                                  disabled={g.locked}
                                >
                                  Remover
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
