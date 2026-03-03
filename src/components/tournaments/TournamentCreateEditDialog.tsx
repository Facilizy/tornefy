import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, X } from "lucide-react";

export type TournamentRow = {
  id: string;
  organizer_id: string;
  name: string;
  banner_url: string | null;
  datetime: string | null;
  game: string | null;
  platform: string | null;
  mode: string | null;
  rules: string | null;
  important_info: string | null;
  status: string;
  is_private: boolean;
  invited_tags: any;
  created_at: string;
  updated_at: string;
};

type TournamentForm = {
  name: string;
  datetime: string;
  game: string;
  platform: string;
  mode: string;
  status: string;
  is_private: boolean;
  invited_tags: string[];
  entry_fee_coins: number;
};

const DEFAULT_FORM: TournamentForm = {
  name: "",
  datetime: "",
  game: "free_fire",
  platform: "PC",
  mode: "Squad",
  status: "draft",
  is_private: false,
  invited_tags: [],
  entry_fee_coins: 0,
};

function normalizeInvitedTags(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  // Convert to local before slicing.
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function toIsoOrNull(datetimeLocal: string): string | null {
  const raw = (datetimeLocal ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function TournamentCreateEditDialog({
  open,
  onOpenChange,
  organizerId,
  tournament,
  onSaved,
  presetEntryFeeCoins,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizerId: string;
  tournament: TournamentRow | null;
  onSaved: () => void;
  presetEntryFeeCoins?: number;
}) {
  const initialForm = useMemo((): TournamentForm => {
    if (!tournament) {
      return {
        ...DEFAULT_FORM,
        entry_fee_coins: Math.max(0, Math.trunc(Number(presetEntryFeeCoins) || 0)),
      };
    }
    return {
      name: tournament.name ?? "",
      datetime: toDatetimeLocal(tournament.datetime ?? null),
      game: (tournament.game ?? "free_fire") as string,
      platform: (tournament.platform ?? "PC") as string,
      mode: (tournament.mode ?? "Squad") as string,
      status: tournament.status ?? "draft",
      is_private: !!tournament.is_private,
      invited_tags: normalizeInvitedTags(tournament.invited_tags),
      entry_fee_coins: Number((tournament as any).entry_fee_coins ?? 0) || 0,
    };
  }, [tournament, presetEntryFeeCoins]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TournamentForm>(initialForm);
  const [tagText, setTagText] = useState("");

  // Reset when switching tournament/open
  useState(() => {
    // noop placeholder
  });

  const syncInitial = () => {
    setForm(initialForm);
    setTagText("");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) syncInitial();
  };

  const addTagsFromText = () => {
    const raw = tagText
      .split(/[,\n]/g)
      .map((t) => t.trim())
      .filter(Boolean);
    if (raw.length === 0) return;
    const merged = Array.from(new Set([...(form.invited_tags ?? []), ...raw]));
    setForm({ ...form, invited_tags: merged });
    setTagText("");
  };

  const removeTag = (tag: string) => {
    setForm({
      ...form,
      invited_tags: (form.invited_tags || []).filter((t) => t !== tag),
    });
  };

  const save = async () => {
    try {
      setSaving(true);

      if (!form.name.trim()) {
        toast.error("Informe o nome do torneio");
        return;
      }

      const payload: any = {
        organizer_id: organizerId,
        name: form.name.trim(),
        datetime: toIsoOrNull(form.datetime),
        game: form.game,
        platform: form.platform,
        mode: form.mode,
        status: form.status,
        is_private: !!form.is_private,
        invited_tags: form.invited_tags,
        entry_fee_coins: Math.max(0, Math.trunc(Number(form.entry_fee_coins) || 0)),
      };

      if (payload.datetime === null) delete payload.datetime;

      if (tournament?.id) {
        const { error } = await (supabase as any)
          .from("tournaments")
          .update(payload)
          .eq("id", tournament.id);
        if (error) throw error;
        toast.success("Torneio atualizado!");
      } else {
        const id = crypto.randomUUID();
        const { error } = await (supabase as any)
          .from("tournaments")
          .insert({ ...payload, id });
        if (error) throw error;
        toast.success("Torneio criado!");
      }

      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar torneio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl w-[95vw] sm:w-full p-0">
        <div className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                {tournament ? "Editar Torneio" : "Criar Torneio"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Crie o torneio com o mesmo padrão premium — e depois você organiza por grupos.
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                    Básico
                  </h3>
                  <Separator className="ml-3 flex-1" />
                </div>

                <div>
                  <Label htmlFor="t-name">Nome do Torneio</Label>
                  <Input
                    id="t-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="t-fee">Entrada</Label>
                    <Select
                      value={(Number(form.entry_fee_coins || 0) > 0 ? "paid" : "free")}
                      onValueChange={(v) => {
                        if (v === "paid") {
                          setForm({ ...form, entry_fee_coins: Math.max(1, form.entry_fee_coins || 10) });
                        } else {
                          setForm({ ...form, entry_fee_coins: 0 });
                        }
                      }}
                    >
                      <SelectTrigger id="t-fee" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Gratuito</SelectItem>
                        <SelectItem value="paid">Pago (TorneCoins)</SelectItem>
                      </SelectContent>
                    </Select>
                    {Number(form.entry_fee_coins || 0) > 0 ? (
                      <Input
                        className="mt-2"
                        inputMode="numeric"
                        placeholder="ex: 10"
                        value={String(form.entry_fee_coins)}
                        onChange={(e) => {
                          const raw = Number(String(e.target.value).replace(/[^0-9]/g, ""));
                          const next = Number.isFinite(raw) ? Math.max(1, Math.min(999999, Math.trunc(raw))) : 1;
                          setForm({ ...form, entry_fee_coins: next });
                        }}
                      />
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Sem taxa de entrada.</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="t-game">Jogo</Label>
                    <Select
                      value={form.game}
                      onValueChange={(v) => setForm({ ...form, game: v })}
                    >
                      <SelectTrigger id="t-game">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free_fire">Free Fire</SelectItem>
                        <SelectItem value="blood_strike">Blood Strike</SelectItem>
                        <SelectItem value="farlight_84">Farlight 84</SelectItem>
                        <SelectItem value="prime_rush">Prime Rush</SelectItem>
                        <SelectItem value="pubg_mobile">PUBG Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="t-platform">Plataforma</Label>
                    <Select
                      value={form.platform}
                      onValueChange={(v) => setForm({ ...form, platform: v })}
                    >
                      <SelectTrigger id="t-platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PC">PC</SelectItem>
                        <SelectItem value="Mobile">Mobile</SelectItem>
                        <SelectItem value="Misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="t-mode">Modo</Label>
                    <Select
                      value={form.mode}
                      onValueChange={(v) => setForm({ ...form, mode: v })}
                    >
                      <SelectTrigger id="t-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Solo">Solo</SelectItem>
                        <SelectItem value="Duo">Duo</SelectItem>
                        <SelectItem value="Squad">Squad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="t-datetime">Data/Hora</Label>
                    <Input
                      id="t-datetime"
                      type="datetime-local"
                      value={form.datetime}
                      onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="t-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger id="t-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="open">Inscrições abertas</SelectItem>
                      <SelectItem value="closed">Inscrições encerradas</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="finished">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                    Privado
                  </h3>
                  <Separator className="ml-3 flex-1" />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/30 p-4">
                  <div>
                    <p className="font-semibold">Torneio privado</p>
                    <p className="text-sm text-muted-foreground">
                      Use tags de convite para controlar quem pode participar.
                    </p>
                  </div>
                  <Switch
                    checked={form.is_private}
                    onCheckedChange={(v) => setForm({ ...form, is_private: !!v })}
                  />
                </div>

                <div>
                  <Label htmlFor="t-tags">Tags convidadas</Label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="t-tags"
                      placeholder="ex: LOUD, FLUXO, X1... (separe por vírgula)"
                      value={tagText}
                      onChange={(e) => setTagText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTagsFromText();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTagsFromText}>
                      Adicionar
                    </Button>
                  </div>

                  {(form.invited_tags?.length ?? 0) > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.invited_tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1"
                            aria-label={`Remover tag ${tag}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Dica: tags funcionam como “chaves” para convidar equipes específicas.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="border-t border-border p-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-gradient-primary gap-2"
                onClick={save}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
