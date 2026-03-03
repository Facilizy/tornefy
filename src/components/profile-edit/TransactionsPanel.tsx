import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FileText, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FilterKey = "hoje" | "ontem" | "semana" | "mes";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  created_at: string;
  from_account_id: string | null;
  to_account_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  meta: any;
};

const TX_TYPE_LABELS: Record<string, string> = {
  deposit: "Depósito",
  entry_fee: "Taxa de entrada",
  refund: "Reembolso",
  release: "Liberação",
  anticipation: "Antecipação",
  withdrawal: "Saque",
  fee: "Taxa",
};

export function TransactionsPanel({ className }: { className?: string }) {
  const [filter, setFilter] = useState<FilterKey>("semana");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadTransactions();
  }, [userId, filter]);

  const loadTransactions = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // First, get user's account ID
      const { data: accountData } = await supabase
        .from("tornecoin_accounts")
        .select("id")
        .eq("owner_type", "user")
        .eq("owner_id", userId)
        .maybeSingle();

      if (!accountData) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setUserAccountId(accountData.id);

      // Calculate date range based on filter
      const now = new Date();
      let startDate = new Date();

      switch (filter) {
        case "hoje":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "ontem":
          startDate.setDate(now.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "semana":
          startDate.setDate(now.getDate() - 7);
          break;
        case "mes":
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Fetch transactions
      const { data, error } = await supabase
        .from("tornecoin_transactions")
        .select("*")
        .or(`from_account_id.eq.${accountData.id},to_account_id.eq.${accountData.id}`)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const isIncoming = (tx: Transaction) => tx.to_account_id === userAccountId;

  return (
    <Card className={cn("p-5 bg-card/40 border-border", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black uppercase">Transações</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórico de entradas e saídas de TorneCoins.
          </p>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as FilterKey)} className="flex flex-wrap gap-2">
          <ToggleGroupItem
            value="hoje"
            className="rounded-full border border-border bg-background/30 px-3 py-1 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Hoje
          </ToggleGroupItem>
          <ToggleGroupItem
            value="ontem"
            className="rounded-full border border-border bg-background/30 px-3 py-1 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Ontem
          </ToggleGroupItem>
          <ToggleGroupItem
            value="semana"
            className="rounded-full border border-border bg-background/30 px-3 py-1 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Esta semana
          </ToggleGroupItem>
          <ToggleGroupItem
            value="mes"
            className="rounded-full border border-border bg-background/30 px-3 py-1 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Este mês
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center justify-center rounded-xl border border-border bg-background/20 p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="mt-4 rounded-xl border border-border bg-background/20 p-6">
          <p className="text-sm font-semibold">Nenhuma transação neste período.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Suas transações aparecerão aqui automaticamente assim que houver movimentações.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {transactions.map((tx) => {
            const incoming = isIncoming(tx);
            const txLabel = TX_TYPE_LABELS[tx.type] || tx.type;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/20 p-4 transition-colors hover:bg-background/30"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "rounded-lg p-2",
                    incoming ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {incoming ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{txLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-black",
                    incoming ? "text-emerald-500" : "text-red-500"
                  )}>
                    {incoming ? "+" : "-"}{tx.amount} TC
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
