import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ArrowDownLeft, ArrowUpRight } from "lucide-react";

type Account = {
  id: string;
  balance_available: number;
  balance_pending: number;
  balance_frozen: number;
};

type Tx = {
  id: string;
  created_at: string;
  amount: number;
  type: string;
  status: string;
  from_account_id: string | null;
  to_account_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  available_at: string | null;
};

function formatCoins(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

export function OrganizerReceivablesPanel({
  organizerId,
  className,
}: {
  organizerId: string | null | undefined;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!organizerId) {
        setAccount(null);
        setTxs([]);
        return;
      }

      try {
        setLoading(true);

        const { data: acc, error: accErr } = await (supabase as any)
          .from("tornecoin_accounts")
          .select("id,balance_available,balance_pending,balance_frozen")
          .eq("owner_id", organizerId)
          .eq("owner_type", "organizer")
          .maybeSingle();

        if (accErr) throw accErr;
        const normalized: Account | null = acc
          ? {
              id: String(acc.id),
              balance_available: Number(acc.balance_available || 0),
              balance_pending: Number(acc.balance_pending || 0),
              balance_frozen: Number(acc.balance_frozen || 0),
            }
          : null;

        setAccount(normalized);

        if (!normalized?.id) {
          setTxs([]);
          return;
        }

        const { data: txData, error: txErr } = await (supabase as any)
          .from("tornecoin_transactions")
          .select(
            "id,created_at,amount,type,status,from_account_id,to_account_id,reference_type,reference_id,available_at"
          )
          .or(`from_account_id.eq.${normalized.id},to_account_id.eq.${normalized.id}`)
          .order("created_at", { ascending: false })
          .limit(20);

        if (txErr) throw txErr;
        setTxs((txData || []) as Tx[]);
      } catch {
        setAccount(null);
        setTxs([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [organizerId]);

  const rows = useMemo(() => {
    const accId = account?.id;
    return txs.map((t) => {
      const dir = accId && t.to_account_id === accId ? "in" : "out";
      const when = t.created_at
        ? new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(t.created_at))
        : "—";

      return { ...t, dir, when };
    });
  }, [txs, account?.id]);

  return (
    <Card className={cn("p-5 bg-card/40 border-border", className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black uppercase">Recebíveis (TorneCoins)</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldo do organizador e últimas movimentações. (Antecipação desativada no momento.)
          </p>
        </div>
        {loading ? (
          <Badge variant="secondary" className="uppercase tracking-wide">
            Carregando…
          </Badge>
        ) : null}
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-background/20 p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Disponível</p>
          <p className="mt-1 text-2xl font-black">
            {formatCoins(Number(account?.balance_available || 0))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/20 p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Pendente (+30d)</p>
          <p className="mt-1 text-2xl font-black">
            {formatCoins(Number(account?.balance_pending || 0))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/20 p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Em cofre (escrow)</p>
          <p className="mt-1 text-2xl font-black">
            {formatCoins(Number(account?.balance_frozen || 0))}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Últimas transações
        </p>

        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma transação ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((t) => {
              const isIn = t.dir === "in";
              return (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isIn ? (
                        <ArrowDownLeft className="h-4 w-4 text-primary" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="text-sm font-semibold truncate">
                        {t.reference_type ? t.reference_type : "Movimentação"}
                      </p>
                      <Badge variant={t.status === "posted" ? "secondary" : "outline"}>
                        {t.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.when}
                      {t.reference_id ? ` · ref: ${t.reference_id}` : ""}
                      {t.available_at ? ` · disponível em: ${new Date(t.available_at).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-black", isIn ? "text-primary" : "")}
                    >
                      {isIn ? "+" : "-"}
                      {formatCoins(Math.abs(Number(t.amount || 0)))}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.type}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
