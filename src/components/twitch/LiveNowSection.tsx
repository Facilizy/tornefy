import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { TwitchMark } from "@/components/twitch/TwitchMark";

type LiveRow = {
  user_id: string;
  twitch_login: string;
  is_live: boolean;
  title: string | null;
  game_name: string | null;
  viewer_count: number | null;
  thumbnail_url: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  title?: string;
  userIds: string[];
  /**
   * When true, the component will call `twitch-sync-live` periodically
   * (and show a refresh button). This should only be enabled for the current user.
   */
  enableSelfSync?: boolean;
  intervalMs?: number;
};

export default function LiveNowSection({
  title = "Ao vivo agora",
  userIds,
  enableSelfSync = false,
  intervalMs = 3 * 60 * 1000,
}: Props) {
  const ids = useMemo(
    () => Array.from(new Set((userIds || []).filter(Boolean))).slice(0, 50),
    [userIds]
  );

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState<Array<LiveRow & { profile?: ProfileRow }>>([]);

  // If the user hasn't connected Twitch yet, calling the sync function returns 400.
  // We disable further sync attempts to avoid unhandled errors / blank screens.
  const disableSelfSyncRef = useRef(false);

  const fetchRows = async () => {
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: liveRows, error: lErr }, { data: profs, error: pErr }] =
        await Promise.all([
          supabase
            .from("twitch_live_status")
            .select(
              "user_id, twitch_login, is_live, title, game_name, viewer_count, thumbnail_url"
            )
            .in("user_id", ids),
          supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", ids),
        ]);

      if (lErr) throw lErr;
      if (pErr) throw pErr;

      const byId = new Map<string, ProfileRow>((profs || []).map((p: any) => [p.id, p]));
      const merged = (liveRows || []).map((r: any) => ({
        ...(r as LiveRow),
        profile: byId.get(r.user_id),
      }));

      // show only who is live
      setRows(merged.filter((r) => r.is_live));
    } finally {
      setLoading(false);
    }
  };

  const syncOnce = async () => {
    if (!enableSelfSync) return;
    if (disableSelfSyncRef.current) return;
    try {
      setSyncing(true);
      // updates only the authenticated user's row server-side
      const { error } = await supabase.functions.invoke("twitch-sync-live", { body: {} });
      if (error) {
        const msg = String((error as any)?.message || error);
        if (msg.toLowerCase().includes("twitch não conectado")) {
          disableSelfSyncRef.current = true;
          return;
        }
        throw error;
      }
    } catch (e) {
      // Keep UI stable; non-critical failures shouldn't break the page.
      console.error("twitch-sync-live failed", e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  useEffect(() => {
    if (!enableSelfSync) return;
    if (ids.length === 0) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await syncOnce();
      if (cancelled) return;
      await fetchRows();
    };

    // run immediately once
    tick();
    const t = window.setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableSelfSync, intervalMs, ids.join(",")]);

  // Requirement: only show the section when someone is actually live.
  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TwitchMark className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-black uppercase">{title}</h2>
            <p className="text-xs text-muted-foreground">Atualiza automaticamente (quando disponível)</p>
          </div>
        </div>

        {enableSelfSync && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={async () => {
              await syncOnce();
              await fetchRows();
            }}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Atualizar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => {
            const name = r.profile?.full_name || r.profile?.username || `@${r.twitch_login}`;
            const viewers = typeof r.viewer_count === "number" ? r.viewer_count : null;
            const subtitle = [r.game_name, viewers !== null ? `${viewers} viewers` : null]
              .filter(Boolean)
              .join(" • ");

            return (
              <a
                key={r.user_id}
                href={`https://twitch.tv/${r.twitch_login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="overflow-hidden bg-card/50 border-border hover:border-primary/40 transition-colors">
                  {r.thumbnail_url ? (
                    <img
                      src={r.thumbnail_url}
                      alt={`Thumbnail da live de ${name}`}
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-muted" />
                  )}

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold uppercase truncate">{name}</p>
                        {subtitle ? (
                          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-black uppercase text-primary">
                        AO VIVO
                      </span>
                    </div>

                    {r.title ? (
                      <p className="mt-2 text-sm text-foreground/90 line-clamp-2">{r.title}</p>
                    ) : null}
                  </div>
                </Card>
              </a>
            );
          })}
      </div>
    </section>
  );
}
