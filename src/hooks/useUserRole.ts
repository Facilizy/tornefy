import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/admin-api";

type AppRole = "player" | "organizer" | "admin";

export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isOrganizerVerified, setIsOrganizerVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setIsOrganizerVerified(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchUserRole();
  }, [userId]);

  const fetchUserRole = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // RLS geralmente bloqueia SELECT direto em `user_roles` para clients.
      // Então derivamos o papel a partir de:
      // - profiles.role (autorizado para o próprio usuário)
      // - RPC pública is_organizer_verified (compat)
      // - checagem server-side de admin via edge function (admin-api /me)
      const [{ data: profileRow }, organizerVerifiedRes, adminRes] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
        (supabase as any).rpc("is_organizer_verified", { _user_id: String(userId) }),
        adminApi<{ user_id: string; is_admin: boolean }>("/me"),
      ]);

      const profileRole = (profileRow as any)?.role ? String((profileRow as any).role) : null;
      const verified = !!(organizerVerifiedRes as any)?.data;
      const isAdmin = adminRes.ok === true && !!adminRes.data?.is_admin;

      setIsOrganizerVerified(verified);

      if (isAdmin) {
        setRole("admin");
      } else if (profileRole === "organizer" || verified) {
        setRole("organizer");
      } else if (profileRole === "player" || !profileRole) {
        setRole("player");
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setIsOrganizerVerified(false);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { role, isOrganizerVerified, loading, refetch: fetchUserRole };
};
