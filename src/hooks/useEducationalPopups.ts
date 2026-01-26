import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type EducationalPopup = {
  id: string;
  kind: "welcome" | "educational" | string;
  active: boolean;
  title: string;
  description: string | null;
  cta_label: string;
  svg_markup: string | null;
  starts_at: string | null;
  ends_at: string | null;
  audience: string;
  created_at: string;
  updated_at: string;
};

export function useEducationalPopups(userId?: string | null) {
  const qc = useQueryClient();

  const popupsQuery = useQuery({
    queryKey: ["popups", "active"],
    enabled: !!userId,
    queryFn: async (): Promise<EducationalPopup[]> => {
      const { data, error } = await supabase
        .from("educational_popups")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const dismissalsQuery = useQuery({
    queryKey: ["popups", "dismissals", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("user_popup_dismissals")
        .select("popup_id")
        .eq("user_id", String(userId));
      if (error) throw error;
      return new Set((data ?? []).map((d: any) => String(d.popup_id)));
    },
  });

  const popupToShow = (() => {
    if (!userId) return null;
    const popups = popupsQuery.data ?? [];
    const dismissed = dismissalsQuery.data ?? new Set<string>();
    if (popups.length === 0) return null;

    const welcome = popups.find((p) => p.kind === "welcome" && !dismissed.has(p.id));
    if (welcome) return welcome;

    const educational = popups.find((p) => p.kind !== "welcome" && !dismissed.has(p.id));
    return educational ?? null;
  })();

  const dismiss = async (popupId: string) => {
    if (!userId) return;
    const { error } = await supabase.from("user_popup_dismissals").insert({
      user_id: String(userId),
      popup_id: popupId,
    } as any);
    // duplicate key -> ignore
    if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
    await qc.invalidateQueries({ queryKey: ["popups", "dismissals", userId] });
  };

  return {
    popup: popupToShow,
    isLoading: popupsQuery.isLoading || dismissalsQuery.isLoading,
    error: popupsQuery.error ?? dismissalsQuery.error,
    dismiss,
    refetch: async () => {
      await Promise.all([popupsQuery.refetch(), dismissalsQuery.refetch()]);
    },
  };
}
