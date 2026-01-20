import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FollowedOrganizer = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export function useFollowedOrganizers(userId: string | null | undefined) {
  const [loading, setLoading] = useState(false);
  const [organizers, setOrganizers] = useState<FollowedOrganizer[]>([]);

  const canUse = !!userId;

  const refetch = useCallback(async () => {
    if (!canUse) {
      setOrganizers([]);
      return;
    }

    try {
      setLoading(true);

      const { data: rows, error } = await supabase
        .from("organizer_follows")
        .select("organizer_id")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const ids = (rows || []).map((r: any) => r.organizer_id).filter(Boolean);
      if (ids.length === 0) {
        setOrganizers([]);
        return;
      }

      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);

      if (pErr) throw pErr;

      // keep order of follow
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      setOrganizers(
        ids
          .map((id: string) => byId.get(id))
          .filter(Boolean)
          .map((p: any) => ({
            id: p.id,
            full_name: p.full_name ?? null,
            username: p.username ?? null,
            avatar_url: p.avatar_url ?? null,
          }))
      );
    } catch (e) {
      console.error("useFollowedOrganizers", e);
    } finally {
      setLoading(false);
    }
  }, [canUse, userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return useMemo(() => ({ organizers, loading, refetch }), [organizers, loading, refetch]);
}
