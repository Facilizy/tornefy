import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrganizerFollowState = {
  isFollowing: boolean;
  followersCount: number;
  loading: boolean;
  toggle: () => Promise<void>;
  refetch: () => Promise<void>;
};

export function useOrganizerFollow(organizerId: string | null | undefined): OrganizerFollowState {
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const canUse = !!organizerId;

  const refetch = useCallback(async () => {
    if (!canUse) return;

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 1) Public count (no IDs)
      const { data: cnt, error: cntErr } = await (supabase as any).rpc(
        "get_organizer_follow_count",
        { _organizer_id: organizerId }
      );
      if (!cntErr) setFollowersCount(Number(cnt ?? 0));

      // 2) Following state (only if logged)
      const uid = session?.user?.id;
      if (!uid) {
        setIsFollowing(false);
        return;
      }

      const { data: row, error: fErr } = await supabase
        .from("organizer_follows")
        .select("id")
        .eq("organizer_id", organizerId)
        .eq("follower_id", uid)
        .maybeSingle();

      if (!fErr) setIsFollowing(!!row);
    } finally {
      setLoading(false);
    }
  }, [canUse, organizerId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const toggle = useCallback(async () => {
    if (!canUse) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const uid = session?.user?.id;
    if (!uid) throw new Error("Você precisa estar logado para seguir um organizador.");

    setLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("organizer_follows")
          .delete()
          .eq("organizer_id", organizerId)
          .eq("follower_id", uid);
        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.from("organizer_follows").insert({
          organizer_id: organizerId,
          follower_id: uid,
        });
        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [canUse, organizerId, isFollowing]);

  return useMemo(
    () => ({ isFollowing, followersCount, loading, toggle, refetch }),
    [isFollowing, followersCount, loading, toggle, refetch]
  );
}
