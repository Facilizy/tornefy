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
import { Loader2, Lock, Plus, RefreshCcw, Shuffle, Trash2, Wand2 } from "lucide-react";
import type { TournamentRegistrationRow } from "./TournamentRegistrationsPanel";

export type TournamentGroupRow = {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number;
  locked: boolean;
  created_at: string;
};

export type TournamentGroupTeamRow = {
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

function shuffleInPlace<T>(arr: T[]) {
  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function groupNameFromIndex(i: number) {
  // A, B, C... Z, AA...
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let n = i;
  let out = "";
  do {
    out = letters[n % 26] + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Grupo ${out}`;
}

export function TournamentGroupsManager({
  tournamentId,
  canManage,
  registrations,
}: {
  tournamentId: string;
  canManage: boolean;
  registrations: TournamentRegistrationRow[];
}) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<TournamentGroupRow[]>([]);
  const [groupTeams, setGroupTeams] = useState<TournamentGroupTeamRow[]>([]);

  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const [generatorCount, setGeneratorCount] = useState<string>("4");
  const [generatorClear, setGeneratorClear] = useState<boolean>(false);
  const [generatorLoading, setGeneratorLoading] = useState<boolean>(false);

  const teamsById = useMemo(() => {
    const map = new Map<string, TournamentRegistrationRow["teams"]>();
    for (const r of registrations) {
      if (r.team_id) map.set(r.team_id, r.teams ?? null);
    }
    return map;
  }, [registrations]);

  const groupById = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g] as const));
    return map;
  }, [groups]);

  const teamAlreadyInAnyGroup = useMemo(() => {
    const set = new Set(groupTeams.map((gt) => gt.team_id));
    return set;
  }, [groupTeams]);

  const hasLockedGroup = useMemo(() => groups.some((g) => g.locked), [groups]);

  const unassignedTeams = useMemo(() => {
    return registrations
      .filter((r) => r.status !== "cancelled" && r.status !== "refunded")
      .filter((r) => !teamAlreadyInAnyGroup.has(r.team_id));
  }, [registrations, teamAlreadyInAnyGroup]);

  const fetchAll = useCallback(async () => {
    if (!canManage) return;
    try {
      setLoading(true);
      const [gRes, gtRes] = await Promise.all([
        (supabase as any)
          .from("tournament_groups")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        (supabase as any)
          .from("tournament_group_teams")
          .select("id,group_id,team_id,seed,created_at, teams(id,name,tag,logo_url)")
          .order("created_at", { ascending: true }),
      ]);

      if (gRes.error) throw gRes.error;
      if (gtRes.error) throw gtRes.error;

      // Filter group teams only for groups in this tournament (avoid extra index complexity now)
      const tournamentGroupIds = new Set((gRes.data || []).map((g: any) => g.id));
      const onlyThisTournament = (gtRes.data || []).filter((gt: any) =>
        tournamentGroupIds.has(gt.group_id)
      );

      setGroups((gRes.data || []) as TournamentGroupRow[]);
      setGroupTeams(onlyThisTournament as TournamentGroupTeamRow[]);

      if (!selectedGroupId && (gRes.data || []).length > 0) {
        setSelectedGroupId((gRes.data || [])[0].id);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  }, [canManage, tournamentId, selectedGroupId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const createGroup = async () => {
    try {
      const name = newGroupName.trim();
      if (!name) {
        toast.error("Informe o nome do grupo");
        return;
      }

      const nextOrder =
        groups.length === 0 ? 0 : Math.max(...groups.map((g) => g.sort_order)) + 1;

      const { error } = await (supabase as any).from("tournament_groups").insert({
        tournament_id: tournamentId,
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
    try {
      const { error } = await (supabase as any)
        .from("tournament_groups")
        .update({ locked })
        .eq("id", groupId);
      if (error) throw error;
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar grupo");
    }
  };

  const assignTeam = async () => {
    try {
      if (!selectedGroupId) {
        toast.error("Selecione um grupo");
        return;
      }
      if (!selectedTeamId) {
        toast.error("Selecione uma equipe");
        return;
      }

      const g = groupById.get(selectedGroupId);
      if (g?.locked) {
        toast.error("Grupo travado. Destrave para alterar.");
        return;
      }

      if (teamAlreadyInAnyGroup.has(selectedTeamId)) {
        toast.error("Essa equipe já está em um grupo.");
        return;
      }

      const { error } = await (supabase as any)
        .from("tournament_group_teams")
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
    try {
      const g = groupById.get(groupId);
      if (g?.locked) {
        toast.error("Grupo travado. Destrave para alterar.");
        return;
      }

      const { error } = await (supabase as any)
        .from("tournament_group_teams")
        .delete()
        .eq("id", rowId);
      if (error) throw error;

      toast.success("Equipe removida do grupo");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover equipe");
    }
  };

  const handleGenerateAndDistribute = async () => {
    if (hasLockedGroup) {
      toast.error("Existem grupos travados. Destrave para gerar/distribuir.");
      return;
    }

    const count = Number.parseInt(generatorCount, 10);
    if (!Number.isFinite(count) || count < 1 || count > 64) {
      toast.error("Informe uma quantidade de grupos válida (1 a 64)");
      return;
    }

    try {
      setGeneratorLoading(true);

      // Ensure groups exist
      let nextGroups = groups;
      if (nextGroups.length === 0) {
        const inserts = Array.from({ length: count }).map((_, idx) => ({
          tournament_id: tournamentId,
          name: groupNameFromIndex(idx),
          sort_order: idx,
          locked: false,
        }));

        const { error } = await (supabase as any).from("tournament_groups").insert(inserts);
        if (error) throw error;

        await fetchAll();
        // refresh local snapshot
        const { data: gData, error: gError } = await (supabase as any)
          .from("tournament_groups")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        if (gError) throw gError;
        nextGroups = (gData || []) as TournamentGroupRow[];
      }

      const targetGroups = nextGroups.slice(0, count);
      if (targetGroups.length < count) {
        toast.error(
          `Você pediu ${count} grupos, mas existem apenas ${targetGroups.length}. Crie mais grupos ou reduza a quantidade.`
        );
        return;
      }

      const targetGroupIds = targetGroups.map((g) => g.id);

      if (generatorClear) {
        const { error } = await (supabase as any)
          .from("tournament_group_teams")
          .delete()
          .in("group_id", targetGroupIds);
        if (error) throw error;
      }

      // Build team pool: skip already allocated (unless we just cleared, in which case groupTeams will be stale)
      const alreadyAllocated = new Set<string>();
      if (!generatorClear) {
        groupTeams.forEach((gt) => alreadyAllocated.add(gt.team_id));
      }

      const pool = registrations
        .filter((r) => r.status !== "cancelled" && r.status !== "refunded")
        .filter((r) => !alreadyAllocated.has(r.team_id));

      if (pool.length === 0) {
        toast.message("Nenhuma equipe disponível para distribuir.");
        await fetchAll();
        return;
      }

      const shuffled = shuffleInPlace(pool.slice());

      // Round-robin into groups
      const byGroup: Record<string, string[]> = {};
      targetGroupIds.forEach((id) => (byGroup[id] = []));

      shuffled.forEach((r, idx) => {
        const groupId = targetGroupIds[idx % targetGroupIds.length];
        byGroup[groupId].push(r.team_id);
      });

      const inserts: Array<{ group_id: string; team_id: string; seed: number | null }> = [];
      for (const gId of targetGroupIds) {
        const teams = byGroup[gId] || [];
        teams.forEach((teamId, index) => {
          // Seed is optional, but useful for sorting inside the group
          inserts.push({ group_id: gId, team_id: teamId, seed: index + 1 });
        });
      }

      if (inserts.length > 0) {
        const { error } = await (supabase as any).from("tournament_group_teams").insert(inserts);
        if (error) throw error;
      }

      toast.success("Grupos gerados/distribuídos!");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar/distribuir grupos");
    } finally {
      setGeneratorLoading(false);
    }
  };

  if (!canManage) return null;

  return (
    <Card className="p-5 bg-card/50 border-border">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-black uppercase tracking-wide">Grupos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie grupos e adicione equipes inscritas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAll} className="gap-2" disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando grupos…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Generator */}
          <div className="rounded-xl border border-border bg-background/30 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold">Gerar + distribuir (aleatório)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Respeita grupos travados, evita duplicados e pula equipes já alocadas.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleGenerateAndDistribute}
                className="gap-2"
                disabled={generatorLoading}
              >
                <Wand2 className="h-4 w-4" />
                {generatorLoading ? "Processando…" : "Gerar e distribuir"}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor="gen-count">Quantidade de grupos</Label>
                <Input
                  id="gen-count"
                  inputMode="numeric"
                  value={generatorCount}
                  onChange={(e) => setGeneratorCount(e.target.value)}
                  className="bg-background/40"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Opções</Label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={generatorClear ? "default" : "outline"}
                    onClick={() => setGeneratorClear((v) => !v)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {generatorClear ? "Vai limpar antes" : "Não vai limpar"}
                  </Button>

                  {hasLockedGroup ? (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Há grupos travados
                    </Badge>
                  ) : null}

                  <Badge variant="outline" className="gap-1">
                    <Shuffle className="h-3 w-3" />
                    {unassignedTeams.length} sem grupo
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Create group */}
          <div className="rounded-xl border border-border bg-background/30 p-4">
            <p className="text-sm font-semibold">Criar grupo</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Label htmlFor="new-group" className="sr-only">
                  Nome do grupo
                </Label>
                <Input
                  id="new-group"
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

          {/* Assign */}
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
                      <SelectItem key={g.id} value={g.id}>
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
                        const teamName =
                          r.teams?.name || teamsById.get(r.team_id)?.name || "Equipe";
                        const teamTag = r.teams?.tag || teamsById.get(r.team_id)?.tag || "—";
                        return (
                          <SelectItem key={r.team_id} value={r.team_id}>
                            {teamName} [{teamTag}]
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="button" onClick={assignTeam} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Group list */}
          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
            ) : (
              groups.map((g) => {
                const members = groupTeams
                  .filter((gt) => gt.group_id === g.id)
                  .map((gt) => ({
                    ...gt,
                    name: gt.teams?.name || teamsById.get(gt.team_id)?.name || "Equipe",
                    tag: gt.teams?.tag || teamsById.get(gt.team_id)?.tag || "—",
                  }));

                return (
                  <div key={g.id} className="rounded-2xl border border-border bg-background/30 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black uppercase tracking-wide">{g.name}</h4>
                          {g.locked ? (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Travado
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {members.length} equipe{members.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2">
                          <span className="text-xs text-muted-foreground">Travado</span>
                          <Switch checked={g.locked} onCheckedChange={(v) => toggleLock(g.id, !!v)} />
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem equipes neste grupo.</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/40 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {m.name} <span className="text-muted-foreground">[{m.tag}]</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTeam(m.id, g.id)}
                              disabled={g.locked}
                            >
                              Remover
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
