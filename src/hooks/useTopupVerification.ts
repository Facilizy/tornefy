import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTopupVerification(
    userId: string | undefined,
    onSuccess?: (uid: string) => Promise<void>
) {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const topup = sp.get("topup");
        const sessionId = sp.get("session_id");

        if (topup === "cancel") {
            toast.message("Pagamento cancelado.");
            sp.delete("topup");
            sp.delete("session_id");
            const next = sp.toString();
            navigate(next ? `/profile/edit?${next}` : "/profile/edit", { replace: true });
            return;
        }

        if (topup !== "success" || !sessionId || !userId) return;

        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase.functions.invoke("tornecoins-topup-verify", {
                    body: { session_id: sessionId },
                });
                if (error) throw error;
                if (cancelled) return;

                const amount = Number((data as any)?.amount_coins ?? 0);
                const already = !!(data as any)?.already_credited;

                toast.success(
                    already
                        ? "Recarga já confirmada anteriormente."
                        : `Recarga confirmada: +${Number.isFinite(amount) ? amount : 0} TC`,
                );

                if (onSuccess) await onSuccess(userId);

                sp.delete("topup");
                sp.delete("session_id");
                const next = sp.toString();
                navigate(next ? `/profile/edit?${next}` : "/profile/edit", { replace: true });
            } catch (e: any) {
                console.error(e);
                toast.error(e?.message || "Erro ao confirmar recarga");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [location.search, navigate, userId, onSuccess]);
}
