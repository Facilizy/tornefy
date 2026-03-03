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

      // Segurança: papéis devem vir do backend (tabela user_roles), nunca do profiles/local.
      const [rolesRes, organizerVerifiedRes] = await Promise.all([
        adminApi<{ roles: AppRole[] }>("/roles/me"),
        (supabase as any).rpc("is_organizer_verified", { _user_id: String(userId) }),
      ]);

      const roles = rolesRes.ok === true ? (rolesRes.data.roles || []) : [];
      const verified = !!(organizerVerifiedRes as any)?.data;
      setIsOrganizerVerified(verified);

      if (roles.includes("admin")) {
        setRole("admin");
      } else if (roles.includes("organizer") || verified) {
        setRole("organizer");
      } else if (roles.includes("player") || roles.length === 0) {
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
