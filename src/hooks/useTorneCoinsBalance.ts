import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TorneCoinsBalance = {
    available: number;
    pending: number;
    frozen: number;
    total: number;
    loading: boolean;
};

export function useTorneCoinsBalance(userId?: string) {
    const [balance, setBalance] = useState<TorneCoinsBalance>({
        available: 0,
        pending: 0,
        frozen: 0,
        total: 0,
        loading: true,
    });

    const fetchBalance = useCallback(async () => {
        if (!userId) {
            setBalance({ available: 0, pending: 0, frozen: 0, total: 0, loading: false });
            return;
        }

        try {
            const { data, error } = await (supabase as any)
                .from("tornecoin_accounts")
                .select("balance_available,balance_pending,balance_frozen")
                .eq("owner_id", userId)
                .eq("owner_type", "user")
                .maybeSingle();

            if (error) throw error;

            const available = Number(data?.balance_available || 0);
            const pending = Number(data?.balance_pending || 0);
            const frozen = Number(data?.balance_frozen || 0);
            const total = available + pending + frozen;

            setBalance({ available, pending, frozen, total, loading: false });
        } catch (error) {
            console.error("Error fetching balance:", error);
            setBalance((prev) => ({ ...prev, loading: false }));
        }
    }, [userId]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return { ...balance, refetch: fetchBalance };
}
