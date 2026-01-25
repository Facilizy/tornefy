import { supabase } from "@/integrations/supabase/client";
import { fetchVerifiedMap } from "@/hooks/useVerifiedEntities";

type TrainingRow = {
  organizer_id?: string | null;
  [key: string]: any;
};

export async function withOrganizerMeta<T extends TrainingRow>(trainings: T[]) {
  const organizerIds = Array.from(
    new Set(trainings.map((t) => t.organizer_id).filter((id): id is string => Boolean(id)))
  );

  const organizerMap = new Map<string, { name: string | null; avatar_url: string | null }>();
  const verifiedSet = new Set<string>();

  if (organizerIds.length > 0) {
    const [{ data: profilesData, error: pErr }, verifiedMap] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", organizerIds),
      // Usa o sistema unificado de verificação (public RPC via verified_entities_public),
      // que funciona para player e para deslogado.
      fetchVerifiedMap("user", organizerIds),
    ]);

    if (!pErr) {
      (profilesData || []).forEach((p: any) => {
        const name = p.username || p.full_name || null;
        organizerMap.set(String(p.id), { name, avatar_url: p.avatar_url || null });
      });
    }

    organizerIds.forEach((id) => {
      if (verifiedMap.get(String(id))) verifiedSet.add(String(id));
    });
  }

  return trainings.map((training) => {
    const organizerId = training.organizer_id ? String(training.organizer_id) : null;
    return {
      ...training,
      organizer_name: organizerId ? organizerMap.get(organizerId)?.name ?? null : null,
      organizer_avatar_url: organizerId
        ? organizerMap.get(organizerId)?.avatar_url ?? null
        : null,
      organizer_verified: organizerId ? verifiedSet.has(organizerId) : false,
    } as T & {
      organizer_name: string | null;
      organizer_avatar_url: string | null;
      organizer_verified: boolean;
    };
  });
}
