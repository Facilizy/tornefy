import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type MvpPlayerRow = {
  treino_id: string;
  rank: number;
  player_name: string;
  avatar_url: string | null;
  mvps: number;
  kills: number;
  team_name: string | null;
  team_tag: string | null;
  team_logo: string | null;
};

const VIEW_NAME = "vw_tornefy_mvp_players";
const POLL_MS = 10_000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isHexColor(s: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s || ""));
}

function hashRows(rows: MvpPlayerRow[]) {
  return JSON.stringify(rows.map((r) => [r.rank, r.player_name, r.mvps, r.kills, r.team_tag, r.avatar_url, r.team_logo]));
}

export default function OverlayMvpRanking() {
  const [qs] = useSearchParams();

  const treinoId = qs.get("treino_id") || "";
  const topRaw = Number(qs.get("top") || "10");
  const top = Number.isFinite(topRaw) ? clamp(topRaw, 1, 24) : 10;

  const fontRaw = Number(qs.get("font") || "18");
  const font = Number.isFinite(fontRaw) ? clamp(fontRaw, 12, 28) : 18;

  const fontColorRaw = qs.get("font_color") || "";
  const fontColor = isHexColor(fontColorRaw) ? fontColorRaw : "";

  const firstColorRaw = qs.get("first_color") || "";
  const firstColor = isHexColor(firstColorRaw) ? firstColorRaw : "";

  const [rows, setRows] = useState<MvpPlayerRow[]>([]);
  const [activeRank, setActiveRank] = useState<number>(1);
  const [status, setStatus] = useState<string>("");
  const lastHash = useRef<string>("");

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    async function fetchOnce() {
      try {
        if (!treinoId) {
          if (mounted) {
            setRows([]);
            setStatus("Informe ?treino_id=");
          }
          return;
        }

        const { data, error } = await (supabase as any)
          .from(VIEW_NAME)
          .select("treino_id,rank,player_name,avatar_url,mvps,kills,team_name,team_tag,team_logo")
          .eq("treino_id", treinoId)
          .order("rank", { ascending: true })
          .limit(24);

        if (error) throw error;
        const parsed: MvpPlayerRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
          treino_id: String(r.treino_id ?? ""),
          rank: Number(r.rank ?? 0),
          player_name: String(r.player_name ?? ""),
          avatar_url: r.avatar_url ?? null,
          mvps: Number(r.mvps ?? 0),
          kills: Number(r.kills ?? 0),
          team_name: r.team_name ?? null,
          team_tag: r.team_tag ?? null,
          team_logo: r.team_logo ?? null,
        }));

        const next = parsed.filter((r) => r.rank > 0).slice(0, top);
        const h = hashRows(next);
        if (h !== lastHash.current) {
          lastHash.current = h;
          if (mounted) setRows(next);
        }

        if (mounted) {
          if (!next.some((r) => r.rank === activeRank)) setActiveRank(next[0]?.rank ?? 1);
          const now = new Date();
          setStatus(
            `Atualizado ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        if (mounted) setStatus(`Erro ao carregar: ${String((e as any)?.message ?? e)}`);
      }
    }

    fetchOnce();
    timer = window.setInterval(fetchOnce, POLL_MS);
    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [treinoId, top, activeRank]);

  const active = useMemo(() => rows.find((r) => r.rank === activeRank) ?? rows[0] ?? null, [rows, activeRank]);

  return (
    <div
      style={{ width: 1920, height: 300, background: "transparent", color: fontColor || undefined }}
      className="overflow-hidden text-foreground px-[78px]"
    >
      <div className="w-full h-full flex items-center">
        <div className="w-full border border-border rounded-2xl bg-card/70 backdrop-blur-sm px-8 py-6">
          <div className="flex items-stretch gap-8">
            {/* Lista */}
            <div className="w-[560px] flex-none">
              <div className="text-xs uppercase tracking-[0.18em] font-extrabold opacity-80 mb-3">MVP RANKING</div>
              <div className="space-y-2">
                {rows.length ? (
                  rows.map((r) => {
                    const isFirst = r.rank === 1;
                    const isActive = r.rank === activeRank;
                    const accent = isFirst && firstColor ? ({ color: firstColor } as const) : undefined;
                    return (
                      <button
                        key={r.rank}
                        type="button"
                        onClick={() => setActiveRank(r.rank)}
                        className={
                          "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors " +
                          (isActive ? "border-primary/60 bg-muted/20" : "border-border/60 bg-transparent hover:bg-muted/10")
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 text-center font-black" style={{ fontSize: font, ...accent }}>
                            {String(r.rank).padStart(2, "0")}
                          </div>
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-border flex-none" style={{ background: "transparent" }}>
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt={`Foto ${r.player_name}`} className="w-full h-full object-cover" loading="lazy" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black truncate" style={{ fontSize: font, ...accent }}>
                              {r.player_name || "—"}
                            </div>
                            <div className="text-xs opacity-80 truncate" style={{ ...accent }}>
                              {r.team_name ? r.team_name : ""} {r.team_tag ? `[${r.team_tag}]` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-none">
                          <div className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs">
                            MVPs <span className="font-black" style={{ ...accent }}>{r.mvps}</span>
                          </div>
                          <div className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs">
                            Kills <span className="font-black" style={{ ...accent }}>{r.kills}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-sm opacity-80">Sem dados de MVP.</div>
                )}
              </div>
            </div>

            {/* Destaque (abre ao clicar) */}
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-[0.18em] font-extrabold opacity-80 mb-3">DESTAQUE</div>
              <div className="h-[196px] rounded-2xl border border-border bg-muted/10 px-6 py-5 flex items-center justify-between gap-6">
                <div className="flex items-center gap-5 min-w-0">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border flex-none" style={{ background: "transparent" }}>
                    {active?.avatar_url ? (
                      <img src={active.avatar_url} alt={`Foto ${active.player_name}`} className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.18em] font-extrabold opacity-80">MVP</div>
                    <div className="font-black truncate" style={{ fontSize: font + 8 }}>
                      {active?.player_name || "—"}
                    </div>
                    <div className="mt-1 text-sm opacity-80 truncate">
                      {active?.team_name ? active.team_name : ""} {active?.team_tag ? `[${active.team_tag}]` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-none">
                  <div className="rounded-full border border-border bg-muted/30 px-4 py-2 text-sm">
                    Rank <span className="font-black" style={{ fontSize: font }}>{active ? active.rank : "—"}</span>
                  </div>
                  <div className="rounded-full border border-border bg-muted/30 px-4 py-2 text-sm">
                    MVPs <span className="font-black" style={{ fontSize: font }}>{active ? active.mvps : "—"}</span>
                  </div>
                  <div className="rounded-full border border-border bg-muted/30 px-4 py-2 text-sm">
                    Kills <span className="font-black" style={{ fontSize: font }}>{active ? active.kills : "—"}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[11px] opacity-70">{status}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
