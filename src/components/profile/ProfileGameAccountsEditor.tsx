import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Sparkles } from "lucide-react";
import type { Game, GameAccountRow as Row } from "./game-accounts/types";

function normalizeNick(raw: string) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function ProfileGameAccountsEditor({
  userId,
  games,
  preferredGameIds,
  defaultNick,
}: {
  userId: string;
  games: Game[];
  preferredGameIds?: string[];
  defaultNick?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const gameById = useMemo(() => new Map(games.map((g) => [g.id, g] as const)), [games]);

  const usedGameIds = useMemo(() => new Set(rows.map((r) => r.game_id).filter(Boolean)), [rows]);

  const dupGameIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.game_id) continue;
      counts.set(r.game_id, (counts.get(r.game_id) || 0) + 1);
    }
    return new Set(Array.from(counts.entries()).filter(([, c]) => c > 1).map(([g]) => g));
  }, [rows]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("player_game_accounts")
          .select("id, game_id, in_game_nick, in_game_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!mounted) return;

        setRows(
          (data || []).map((r: any) => ({
            id: r.id,
            game_id: r.game_id ?? "",
            in_game_nick: r.in_game_nick ?? "",
            in_game_id: r.in_game_id ?? "",
          })),
        );
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Erro ao carregar contas por jogo");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const validate = () => {
    for (const r of rows) {
      if (!r.game_id) {
        toast.error("Selecione o jogo em todas as linhas");
        return false;
      }
      if (!normalizeNick(r.in_game_nick)) {
        toast.error("O nick é obrigatório em todas as linhas");
        return false;
      }
    }

    const dup = Array.from(dupGameIds)[0];
    if (dup) {
      toast.error(`Regra: apenas 1 conta por jogo (${gameById.get(dup)?.name || dup}).`);
      return false;
    }
    return true;
  };

  const firstAvailableGameId = useMemo(() => {
    const preferred = (preferredGameIds || []).filter((id) => games.some((g) => g.id === id));
    const ordered = preferred.length > 0 ? preferred : games.map((g) => g.id);
    return ordered.find((id) => !usedGameIds.has(id)) || "";
  }, [games, preferredGameIds, usedGameIds]);

  const canAddMore = useMemo(() => usedGameIds.size < games.length, [usedGameIds, games.length]);

  const addRow = (gameId?: string) => {
    const nextId = gameId || firstAvailableGameId;
    setRows((p) => [
      ...p,
      {
        game_id: nextId || "",
        in_game_nick: defaultNick || "",
        in_game_id: "",
      },
    ]);
  };

  const canQuickAddFreeFire = useMemo(
    () => games.some((g) => g.id === "free_fire") && !usedGameIds.has("free_fire"),
    [games, usedGameIds],
  );

  const saveAll = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Persist each row as insert/update.
      for (const r of rows) {
        const payload = {
          user_id: userId,
          game_id: r.game_id,
          in_game_nick: normalizeNick(r.in_game_nick),
          in_game_id: normalizeNick(r.in_game_id) || null,
        } as any;

        if (r.id) {
          const { error } = await supabase
            .from("player_game_accounts")
            .update(payload)
            .eq("id", r.id)
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("player_game_accounts")
            .insert(payload)
            .select("id")
            .single();
          if (error) throw error;

          // Attach generated id to local row.
          setRows((prev) => {
            const idx = prev.findIndex((x) => x === r);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], id: (data as any)?.id };
            return next;
          });
        }
      }

      toast.success("Contas por jogo salvas!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao salvar contas por jogo");
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (idx: number) => {
    const r = rows[idx];
    if (!r) return;

    // Remove locally first for snappy UI.
    setRows((p) => p.filter((_, i) => i !== idx));

    if (!r.id) return;
    try {
      const { error } = await supabase
        .from("player_game_accounts")
        .delete()
        .eq("id", r.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Conta removida");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao remover conta");
    }
  };

  return (
    <Card className="p-4 md:p-5 bg-card/50 border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Contas por jogo</p>
          <p className="text-sm text-muted-foreground">
            Vincule seu nick (e ID opcional) por jogo para o Auto‑Placar reconhecer jogadores.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Regra: <span className="font-medium text-foreground">1 conta por jogo</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addRow()}
            className="gap-2"
            disabled={!canAddMore || loading}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
          <Button type="button" size="sm" onClick={saveAll} disabled={saving || loading} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {(canQuickAddFreeFire || (!!firstAvailableGameId && (preferredGameIds?.length || 0) > 0)) && !loading ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Sugestões rápidas:
          </span>
          {canQuickAddFreeFire ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => addRow("free_fire")}>
              + Free Fire
            </Button>
          ) : null}
          {!!firstAvailableGameId && (preferredGameIds?.length || 0) > 0 ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => addRow(firstAvailableGameId)}>
              + Próximo favorito
            </Button>
          ) : null}
        </div>
      ) : null}

      <Separator className="my-4" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhuma conta cadastrada ainda.
          {canAddMore ? (
            <>
              {" "}
              Clique em <span className="font-medium text-foreground">Adicionar</span>.
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => {
            const game = gameById.get(r.game_id);
            const isDup = !!r.game_id && dupGameIds.has(r.game_id);
            return (
              <div
                key={r.id || `${r.game_id}:${idx}`}
                className={
                  "rounded-xl border bg-background/30 p-3 shadow-sm " +
                  (isDup ? "border-destructive/60 bg-destructive/5" : "border-border")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-xl border border-border bg-background/40 grid place-items-center">
                      {game?.logo ? (
                        <img
                          src={game.logo}
                          alt={`Logo do jogo ${game.name}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground">{game?.name || "Jogo"}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Label className="text-xs">Jogo</Label>
                      <select
                        value={r.game_id}
                        onChange={(e) => {
                          const next = e.target.value;
                          setRows((p) => p.map((x, i) => (i === idx ? { ...x, game_id: next } : x)));
                        }}
                        className="mt-1 h-10 w-full rounded-md border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                      >
                        <option value="">Selecione…</option>
                        {games.map((g) => (
                          <option key={g.id} value={g.id} disabled={usedGameIds.has(g.id) && g.id !== r.game_id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => removeRow(idx)}
                    aria-label="Remover conta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Nick no jogo *</Label>
                    <Input
                      value={r.in_game_nick}
                      onChange={(e) =>
                        setRows((p) => p.map((x, i) => (i === idx ? { ...x, in_game_nick: e.target.value } : x)))
                      }
                      onBlur={() =>
                        setRows((p) =>
                          p.map((x, i) => (i === idx ? { ...x, in_game_nick: normalizeNick(x.in_game_nick) } : x))
                        )
                      }
                      placeholder="Ex: Tornefy_Pro"
                      className="mt-1 bg-background/50"
                    />
                    {r.game_id === "free_fire" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 rounded-full px-3 text-[11px]"
                          onClick={() =>
                            setRows((p) =>
                              p.map((x, i) =>
                                i === idx
                                  ? { ...x, in_game_nick: normalizeNick(defaultNick || x.in_game_nick) }
                                  : x
                              )
                            )
                          }
                          disabled={!defaultNick}
                        >
                          Usar nick do perfil
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 rounded-full px-3 text-[11px]"
                          onClick={() =>
                            setRows((p) => p.map((x, i) => (i === idx ? { ...x, in_game_id: "" } : x)))
                          }
                        >
                          Limpar ID
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <Label className="text-xs">ID no jogo (opcional)</Label>
                    <Input
                      value={r.in_game_id}
                      onChange={(e) =>
                        setRows((p) => p.map((x, i) => (i === idx ? { ...x, in_game_id: e.target.value } : x)))
                      }
                      onBlur={() =>
                        setRows((p) =>
                          p.map((x, i) => (i === idx ? { ...x, in_game_id: normalizeNick(x.in_game_id) } : x))
                        )
                      }
                      placeholder="Ex: 123456"
                      className="mt-1 bg-background/50"
                    />
                  </div>
                </div>

                {isDup ? (
                  <p className="mt-2 text-xs text-destructive">
                    Regra: apenas 1 conta por jogo — remova uma das linhas duplicadas.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
