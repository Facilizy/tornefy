import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Withdrawal = {
    id: string;
    amount: number;
    created_at: string;
    meta: any;
    status: string;
};

const STATUS_CONFIG = {
    posted: {
        label: "Pendente",
        icon: Clock,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
    },
    completed: {
        label: "Concluído",
        icon: CheckCircle2,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
    },
    cancelled: {
        label: "Cancelado",
        icon: XCircle,
        color: "text-red-500",
        bg: "bg-red-500/10",
    },
};

export function WithdrawalsPanel({ className }: { className?: string }) {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
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
        loadWithdrawals();
    }, [userId]);

    const loadWithdrawals = async () => {
        if (!userId) return;

        try {
            setLoading(true);

            // Get user's account ID
            const { data: accountData } = await supabase
                .from("tornecoin_accounts")
                .select("id")
                .eq("owner_type", "user")
                .eq("owner_id", userId)
                .maybeSingle();

            if (!accountData) {
                setWithdrawals([]);
                setLoading(false);
                return;
            }

            // Fetch withdrawal transactions
            const { data, error } = await supabase
                .from("tornecoin_transactions")
                .select("*")
                .eq("from_account_id", accountData.id)
                .eq("type", "withdrawal")
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            setWithdrawals(data || []);
        } catch (error) {
            console.error("Error loading withdrawals:", error);
            setWithdrawals([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className={cn("p-5 bg-card/40 border-border", className)}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-black uppercase">Minhas Retiradas</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Histórico de saques/retiradas de TorneCoins.
                    </p>
                </div>
            </div>

            <Separator className="my-4" />

            {loading ? (
                <div className="flex items-center justify-center rounded-xl border border-border bg-background/20 p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : withdrawals.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/20 p-6">
                    <p className="text-sm font-semibold">Nenhuma retirada ainda.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Suas solicitações de saque aparecerão aqui automaticamente.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {withdrawals.map((withdrawal) => {
                        const statusConfig = STATUS_CONFIG[withdrawal.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.posted;
                        const StatusIcon = statusConfig.icon;
                        const pixKey = withdrawal.meta?.pix_key;

                        return (
                            <div
                                key={withdrawal.id}
                                className="rounded-xl border border-border bg-background/20 p-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("rounded-lg p-2", statusConfig.bg)}>
                                                <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Saque de TorneCoins</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(withdrawal.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                        </div>

                                        {pixKey && (
                                            <div className="mt-3 rounded-lg border border-border/50 bg-background/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">Chave PIX</p>
                                                <p className="text-sm font-mono">{pixKey}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xl font-black text-red-500">
                                            -{withdrawal.amount} TC
                                        </p>
                                        <div className={cn(
                                            "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                                            statusConfig.bg,
                                            statusConfig.color
                                        )}>
                                            {statusConfig.label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
