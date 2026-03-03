import { useMemo, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Wallet, ArrowDownToLine, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AdminUserDisplay } from "@/components/admin/AdminUserDisplay";

type Summary = { gross: number; net: number; fees: number; pending: number };

type Paginated<T> = { items: T[]; total: number };

type TxRow = {
  id: string;
  created_at: string;
  amount: number;
  type: string;
  status: string;
  reference_type: string | null;
  reference_id: string | null;
};

type WithdrawalRow = {
  id: string;
  created_at: string;
  user_id: string;
  amount_coins: number;
  fee_coins: number;
  net_coins: number;
  pix_key_type: string;
  status: string;
};

type AnticipationRow = {
  id: string;
  created_at: string;
  organizer_id: string;
  amount_coins: number;
  status: string;
};

type StaleOrganizerRow = {
  organizer_id: string;
  trainings_count: number;
  tournaments_count: number;
  last_event_at: string | null;
  pending_coins: number;
  frozen_coins: number;
  total_hold_coins: number;
};

function formatCoins(v: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(v || 0));
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function FinanceAdminTab() {
  const [txType, setTxType] = useState("");
  const [txStatus, setTxStatus] = useState("");

  const summaryQuery = useQuery({
    queryKey: ["admin", "finance", "summary"],
    queryFn: async (): Promise<Summary> => {
      const res = await adminApi<Summary>("/finance/summary");
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const txQuery = useQuery({
    queryKey: ["admin", "finance", "txs", txType, txStatus],
    queryFn: async (): Promise<Paginated<TxRow>> => {
      const res = await adminApi<Paginated<TxRow>>("/finance/transactions", {
        query: {
          type: txType || undefined,
          status: txStatus || undefined,
          limit: "50",
          offset: "0",
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["admin", "finance", "withdrawals"],
    queryFn: async (): Promise<Paginated<WithdrawalRow>> => {
      const res = await adminApi<Paginated<WithdrawalRow>>("/finance/withdrawals", {
        query: { limit: "50", offset: "0" },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const anticipationsQuery = useQuery({
    queryKey: ["admin", "finance", "anticipations"],
    queryFn: async (): Promise<Paginated<AnticipationRow>> => {
      const res = await adminApi<Paginated<AnticipationRow>>("/finance/anticipations", {
        query: { limit: "50", offset: "0" },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const staleQuery = useQuery({
    queryKey: ["admin", "finance", "stale"],
    queryFn: async (): Promise<Paginated<StaleOrganizerRow>> => {
      const res = await adminApi<Paginated<StaleOrganizerRow>>("/finance/organizers/stale", {
        query: { days: "30" },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const summary = summaryQuery.data;

  const cards = useMemo(
    () =>
      [
        { label: "Bruto", value: summary?.gross ?? 0, icon: DollarSign, color: "text-emerald-500" },
        { label: "Taxas", value: summary?.fees ?? 0, icon: TrendingUp, color: "text-amber-500" },
        { label: "Líquido", value: summary?.net ?? 0, icon: Wallet, color: "text-primary" },
        { label: "Pendente", value: summary?.pending ?? 0, icon: Clock, color: "text-muted-foreground" },
      ] as const,
    [summary?.fees, summary?.gross, summary?.net, summary?.pending],
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4 bg-card/40 border-border relative overflow-hidden">
            <div className={`absolute -right-4 -top-4 opacity-5 ${c.color}`}>
              <c.icon className="w-24 h-24" />
            </div>
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <c.icon className={`w-3 h-3 ${c.color}`} />
                {c.label}
              </div>
              <div className={cn("text-2xl font-black mt-1", c.label === "Líquido" && "text-primary")}>
                {formatCoins(c.value)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 bg-card/40 border-border">
        <Tabs defaultValue="txs">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="txs">Transações</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques</TabsTrigger>
            <TabsTrigger value="anticipations">Antecipações</TabsTrigger>
            <TabsTrigger value="stale">+30d finalizado</TabsTrigger>
          </TabsList>

          <TabsContent value="txs" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Input value={txType} onChange={(e) => setTxType(e.target.value)} placeholder="deposit | entry_fee | fee" />
              </div>
              <div>
                <Label>Status</Label>
                <Input value={txStatus} onChange={(e) => setTxStatus(e.target.value)} placeholder="posted | cancelled" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(txQuery.data?.items ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                      <TableCell className="font-semibold">{t.type}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "posted" ? "secondary" : "outline"}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.reference_type ? `${t.reference_type}${t.reference_id ? ` · ${t.reference_id}` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-black">{formatCoins(t.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {(txQuery.data?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        Nenhuma transação.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-4">
            <div className="rounded-xl border border-border bg-background/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Chave PIX</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(withdrawalsQuery.data?.items ?? []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(w.created_at)}</TableCell>
                      <TableCell>
                        <AdminUserDisplay userId={w.user_id} showId />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {w.pix_key_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={w.status === "paid" ? "secondary" : "outline"}>{w.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-black">{formatCoins(w.amount_coins)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCoins(w.fee_coins)}</TableCell>
                      <TableCell className="text-right font-black text-primary">{formatCoins(w.net_coins)}</TableCell>
                    </TableRow>
                  ))}
                  {(withdrawalsQuery.data?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-muted-foreground text-center py-8">
                        Nenhum saque encontrado.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="anticipations" className="mt-4">
            <div className="rounded-xl border border-border bg-background/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Organizador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(anticipationsQuery.data?.items ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(a.created_at)}</TableCell>
                      <TableCell>
                        <AdminUserDisplay userId={a.organizer_id} showId />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-black">{formatCoins(a.amount_coins)}</TableCell>
                    </TableRow>
                  ))}
                  {(anticipationsQuery.data?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground text-center py-8">
                        Nenhuma antecipação.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="stale" className="mt-4">
            <div className="rounded-xl border border-border bg-background/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organizador</TableHead>
                    <TableHead className="text-right">Scrims</TableHead>
                    <TableHead className="text-right">Torneios</TableHead>
                    <TableHead>Último evento</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                    <TableHead className="text-right">Cofre</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(staleQuery.data?.items ?? []).map((r) => (
                    <TableRow key={r.organizer_id}>
                      <TableCell>
                        <AdminUserDisplay userId={r.organizer_id} showId />
                      </TableCell>
                      <TableCell className="text-right font-semibold">{r.trainings_count}</TableCell>
                      <TableCell className="text-right font-semibold">{r.tournaments_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(r.last_event_at)}</TableCell>
                      <TableCell className="text-right">{formatCoins(r.pending_coins)}</TableCell>
                      <TableCell className="text-right">{formatCoins(r.frozen_coins)}</TableCell>
                      <TableCell className="text-right font-black text-primary">{formatCoins(r.total_hold_coins)}</TableCell>
                    </TableRow>
                  ))}
                  {(staleQuery.data?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-muted-foreground text-center py-8">
                        Nenhum organizador encontrado.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
