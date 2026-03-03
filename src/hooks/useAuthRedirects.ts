import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useAuthRedirects(isOAuthCompletion: boolean) {
    const navigate = useNavigate();

    useEffect(() => {
        if (isOAuthCompletion) return;

        let mounted = true;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            if (session?.user) {
                const redirect = popPostAuthRedirect();
                navigate(redirect || "/", { replace: true });
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            if (session?.user) {
                // If we are just refreshing session, stay. 
                // But if we just logged in (how to detect?)
                // Actually Auth page should redirect away if logged in.
                const redirect = popPostAuthRedirect();
                navigate(redirect || "/", { replace: true });
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [navigate, isOAuthCompletion]);
}

export function popPostAuthRedirect() {
    try {
        const raw = localStorage.getItem("post_auth_redirect");
        if (!raw) return null;
        localStorage.removeItem("post_auth_redirect");
        return String(raw);
    } catch {
        return null;
    }
}

export function consumePostAuthAction(navigate: (path: string, opts?: any) => void) {
    try {
        const raw = localStorage.getItem("post_auth_action");
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        localStorage.removeItem("post_auth_action");

        if (parsed?.type === "training_register" && parsed?.trainingId) {
            navigate(`/scrim/${parsed.trainingId}`, { replace: true });
            return true;
        }

        return false;
    } catch {
        return false;
    }
}
