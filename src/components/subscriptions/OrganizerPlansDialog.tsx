import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  benefits_text: string | null;
  monthly_fee_coins: number;
  period_days: number;
  max_subscribers: number | null;
  active: boolean;
};

function calcTornefyFee(total: number) {
  const safeTotal = Math.max(0, Math.trunc(Number(total || 0)));
  if (safeTotal <= 0) return { total: safeTotal, fee: 0, net: 0 };
  const fee = Math.min(safeTotal, Math.max(1, Math.floor(safeTotal * 0.08)));
  return { total: safeTotal, fee, net: safeTotal - fee };
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function OrganizerPlansDialog({
  organizerId,
  onChanged,
  triggerLabel = "Planos",
}: {
  organizerId: string;
  onChanged?: () => void;
  triggerLabel?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSubscribersByPlanId, setActiveSubscribersByPlanId] = useState<Record<string, number>>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const [feeText, setFeeText] = useState("");
  const [periodDaysText, setPeriodDaysText] = useState("30");
  const [maxSubscribersText, setMaxSubscribersText] = useState("");

  const feeValue = useMemo(() => {
    const raw = Number(String(feeText || "0").replace(/[^0-9]/g, ""));
    if (!Number.isFinite(raw)) return 0;
    return clampInt(raw, 0, 999999);
  }, [feeText]);

  const periodDaysValue = useMemo(() => {
    const raw = Number(String(periodDaysText || "0").replace(/[^0-9]/g, ""));
    if (!Number.isFinite(raw)) return 30;
    return clampInt(raw, 1, 365);
  }, [periodDaysText]);

  const maxSubscribersValue = useMemo(() => {
    const rawStr = String(maxSubscribersText || "").trim();
    if (!rawStr) return null;
    const raw = Number(rawStr.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(raw)) return null;
    const v = clampInt(raw, 0, 999999);
    return v > 0 ? v : null;
  }, [maxSubscribersText]);

  const createBreakdown = useMemo(() => calcTornefyFee(feeValue), [feeValue]);

  const fetchPlans = async () => {
    if (!organizerId) return;
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const [plansRes, activeMembershipsRes] = await Promise.all([
        supabase
          .from("organizer_subscription_plans")
          .select("id,name,description,benefits_text,monthly_fee_coins,period_days,max_subscribers,active")
          .eq("organizer_id", organizerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("organizer_plan_memberships")
          .select("plan_id")
          .eq("organizer_id", organizerId)
          .eq("status", "active")
          .gt("current_period_end", nowIso),
      ]);

      if (plansRes.error) throw plansRes.error;
      if (activeMembershipsRes.error) throw activeMembershipsRes.error;

      setPlans((plansRes.data || []) as any);

      const map: Record<string, number> = {};
      for (const row of (activeMembershipsRes.data || []) as any[]) {
        const planId = String(row?.plan_id || "");
        if (!planId) continue;
        map[planId] = (map[planId] || 0) + 1;
      }
      setActiveSubscribersByPlanId(map);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao carregar planos");
      setPlans([]);
      setActiveSubscribersByPlanId({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, organizerId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Informe um nome para o plano");
      return;
    }
    if (feeValue <= 0) {
      toast.error("Informe uma mensalidade válida (TC)");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("organizer_subscription_plans").insert({
        organizer_id: organizerId,
        name: name.trim(),
        description: description.trim() || null,
        benefits_text: benefitsText.trim() || null,
        monthly_fee_coins: feeValue,
        period_days: periodDaysValue,
        max_subscribers: maxSubscribersValue,
        active: true,
      });
      if (error) throw error;

      toast.success("Plano criado!");
      setName("");
      setDescription("");
      setBenefitsText("");
      setFeeText("");
      setPeriodDaysText("30");
      setMaxSubscribersText("");
      await fetchPlans();
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao criar plano");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (plan: Plan, next: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("organizer_subscription_plans")
        .update({ active: next })
        .eq("id", plan.id);
      if (error) throw error;
      await fetchPlans();
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao atualizar plano");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Excluir o plano "${plan.name}"?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from("organizer_subscription_plans")
        .delete()
        .eq("id", plan.id);
      if (error) throw error;
      await fetchPlans();
      onChanged?.();
      toast.success("Plano excluído");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao excluir plano");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" disabled={!organizerId}>
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-card border-border max-w-2xl w-[95vw] sm:w-full p-0">
        <div className="flex max-h-[85vh] flex-col">
          <div className="border-b border-border p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Planos de Assinatura
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Crie planos em TorneCoins para liberar inscrição em scrims exclusivos.
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <Card className="rounded-xl border-border bg-background/30 p-4">
              <p className="text-sm font-black uppercase tracking-wide">Novo plano</p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Nome</Label>
                  <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div>
                  <Label>Valor por pagamento (TC)</Label>
                  <Input
                    className="mt-2"
                    inputMode="numeric"
                    placeholder="ex: 30"
                    value={feeText}
                    onChange={(e) => setFeeText(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Duração (dias)</Label>
                  <Input
                    className="mt-2"
                    inputMode="numeric"
                    placeholder="ex: 30"
                    value={periodDaysText}
                    onChange={(e) => setPeriodDaysText(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Mín. 1, máx. 365 dias.</p>
                </div>

                <div>
                  <Label>Máx. assinantes (opcional)</Label>
                  <Input
                    className="mt-2"
                    inputMode="numeric"
                    placeholder="vazio = ilimitado"
                    value={maxSubscribersText}
                    onChange={(e) => setMaxSubscribersText(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    className="mt-2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Benefícios (opcional)</Label>
                  <Textarea
                    className="mt-2"
                    value={benefitsText}
                    onChange={(e) => setBenefitsText(e.target.value)}
                    rows={4}
                    placeholder={'• Ex.: prioridade nas vagas\n• Acesso a scrims exclusivos'}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background/30 p-4">
                <p className="text-xs font-black uppercase tracking-wide">Resumo por pagamento</p>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-black">{createBreakdown.total} TC</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa Tornefy</p>
                    <p className="text-sm font-black">{createBreakdown.fee} TC</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Você recebe (líquido)</p>
                    <p className="text-sm font-black">{createBreakdown.net} TC</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Taxa: mínimo 1 TC + 8% (descontada a cada pagamento).
                </p>
              </div>

              <div className="mt-3 flex justify-end">
                <Button className="bg-gradient-primary" onClick={handleCreate} disabled={loading}>
                  {loading ? "Salvando…" : "Criar plano"}
                </Button>
              </div>
            </Card>

            <Separator />

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-wide">Seus planos</p>
                {loading ? (
                  <Badge variant="secondary" className="uppercase tracking-wide">
                    Carregando…
                  </Badge>
                ) : null}
              </div>

              {plans.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nenhum plano criado ainda.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {plans.map((p) => {
                    const breakdown = calcTornefyFee(Number(p.monthly_fee_coins || 0));
                    const activeCount = activeSubscribersByPlanId[p.id] || 0;
                    const limitText = p.max_subscribers ? `${activeCount}/${p.max_subscribers}` : String(activeCount);

                    return (
                      <li key={p.id} className="rounded-xl border border-border bg-background/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{p.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {p.description ? p.description : "—"}
                            </p>

                            <div className="mt-3 grid gap-1">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">{breakdown.total} TC</span> a cada{" "}
                                <span className="font-semibold text-foreground">{Number(p.period_days || 30)} dias</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Taxa: <span className="font-semibold text-foreground">{breakdown.fee} TC</span> | Líquido:{" "}
                                <span className="font-semibold text-foreground">{breakdown.net} TC</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Assinantes: <span className="font-semibold text-foreground">{limitText}</span>
                              </p>

                              {p.benefits_text ? (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  Benefícios: <span className="text-foreground">{p.benefits_text}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Ativo</span>
                                <Switch
                                  checked={!!p.active}
                                  onCheckedChange={(next) => handleToggleActive(p, next)}
                                  disabled={loading}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(p)}
                                disabled={loading}
                              >
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="border-t border-border p-5 flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
