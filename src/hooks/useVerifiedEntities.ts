import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerifiedEntityType = "user" | "team";

export function useVerifiedEntity(entityType: VerifiedEntityType, entityId?: string | null) {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!entityId) {
      setVerified(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("is_entity_verified", {
        _entity_type: entityType,
        _entity_id: String(entityId),
      });
      if (error) throw error;

      // Compat: alguns projetos antigos marcam organizadores via role `organizer_verified`
      // (RPC pública `is_organizer_verified`) e não via `verified_entities`.
      // Para não quebrar a exibição (logado/deslogado), faz fallback best-effort.
      if (!data && entityType === "user") {
        try {
          const { data: v, error: vErr } = await (supabase as any).rpc("is_organizer_verified", {
            _user_id: String(entityId),
          });
          if (!vErr && v) {
            setVerified(true);
            return;
          }
        } catch {
          // ignore
        }
      }

      setVerified(!!data);
    } catch {
      setVerified(false);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { verified, loading, refetch };
}

export async function fetchVerifiedMap(entityType: VerifiedEntityType, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean).map(String)));
  const map = new Map<string, boolean>();
  if (!unique.length) return map;

  try {
    const { data, error } = await (supabase as any).rpc("get_verified_entities", {
      _entity_type: entityType,
      _entity_ids: unique,
    });
    if (error) throw error;
    (data || []).forEach((row: any) => {
      if (row?.entity_id) map.set(String(row.entity_id), !!row.verified);
    });

    // Compat: alguns projetos antigos marcam organizadores via role `organizer_verified`
    // (RPC pública `is_organizer_verified`) e não via `verified_entities`.
    // Para não quebrar a exibição para jogador/deslogado, faz fallback best-effort.
    if (entityType === "user") {
      const missing = unique.filter((id) => !map.has(String(id)));
      if (missing.length) {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const { data: v, error: vErr } = await (supabase as any).rpc("is_organizer_verified", {
                _user_id: String(id),
              });
              if (vErr) return [String(id), false] as const;
              return [String(id), !!v] as const;
            } catch {
              return [String(id), false] as const;
            }
          })
        );
        results.forEach(([id, v]) => {
          if (v) map.set(id, true);
        });
      }
    }
  } catch {
    // best-effort
  }
  return map;
}
