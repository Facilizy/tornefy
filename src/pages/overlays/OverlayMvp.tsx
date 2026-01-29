import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type MvpRow = {
  team_name: string;
  team_tag: string | null;
  team_logo: string | null;
  rank: number;
  points: number;
  kills: number;
  mvp_player_name?: string | null;
  mvp_player_kills?: number | null;
  mvp_player_avatar_url?: string | null;
};

const VIEW_NAME = "vw_tornefy_ranking";
const POLL_MS = 10_000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isHexColor(s: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s || ""));
}

function hashRow(r: MvpRow | null) {
  return JSON.stringify(
    r
      ? [r.team_tag, r.rank, r.points, r.kills, r.team_logo, r.mvp_player_name, r.mvp_player_kills]
      : [null]
  );
}

export default function OverlayMvp() {
  const [qs] = useSearchParams();

  const treinoId = qs.get("treino_id") || "";
  const quedaId = qs.get("queda_id") || "";
  const rodadaId = qs.get("rodada_id") || "";

  const showLogo = (qs.get("logo") ?? "1") !== "0";

  const fontRaw = Number(qs.get("font") || "22");
  const font = Number.isFinite(fontRaw) ? clamp(fontRaw, 12, 34) : 22;

  const fontColorRaw = qs.get("font_color") || "";
  const fontColor = isHexColor(fontColorRaw) ? fontColorRaw : "";

  const [row, setRow] = useState<MvpRow | null>(null);
  const [status, setStatus] = useState<string>("");
  const lastHash = useRef<string>("");

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    async function fetchOnce() {
      try {
        if (!treinoId) {
          if (mounted) {
            setRow(null);
            setStatus("Informe ?treino_id=");
          }
          return;
        }

        let query = (supabase as any)
          .from(VIEW_NAME)
          .select(
            "team_name,team_tag,team_logo,rank,points,kills,is_mvp,treino_id,queda_id,rodada_id,mvp_player_name,mvp_player_kills,mvp_player_avatar_url"
          )
          .eq("treino_id", treinoId)
          .eq("is_mvp", true);

        // vw_tornefy_ranking tem níveis (geral/rodada/queda). Mantém o MVP coerente com o filtro.
        if (quedaId) {
          query = query.eq("queda_id", quedaId);
          if (rodadaId) query = query.eq("rodada_id", rodadaId);
        } else if (rodadaId) {
          query = query.is("queda_id", null).eq("rodada_id", rodadaId);
        } else {
          query = query.is("queda_id", null).is("rodada_id", null);
        }

        const { data, error } = await query.limit(1);
        if (error) throw error;

        const next = Array.isArray(data) && data.length
          ? ({
              team_name: String((data as any)[0].team_name ?? ""),
              team_tag: (data as any)[0].team_tag ?? null,
              team_logo: (data as any)[0].team_logo ?? null,
              rank: Number((data as any)[0].rank ?? 0),
              points: Number((data as any)[0].points ?? 0),
              kills: Number((data as any)[0].kills ?? 0),
              mvp_player_name: (data as any)[0].mvp_player_name ?? null,
              mvp_player_kills: (data as any)[0].mvp_player_kills ?? null,
              mvp_player_avatar_url: (data as any)[0].mvp_player_avatar_url ?? null,
            } as MvpRow)
          : null;

        const h = hashRow(next);
        if (h !== lastHash.current) {
          lastHash.current = h;
          if (mounted) setRow(next);
        }

        const now = new Date();
        if (mounted) {
          setStatus(
            `Atualizado ${now.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        if (mounted) setStatus("Erro ao carregar");
      }
    }

    fetchOnce();
    timer = window.setInterval(fetchOnce, POLL_MS);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [treinoId, quedaId, rodadaId]);

  return (
    <div
      style={{ width: 1920, height: 300, background: "transparent", color: fontColor || undefined }}
      className="overflow-hidden text-foreground"
    >
      <div className="w-full h-full flex items-center justify-center px-10">
        <div className="w-full max-w-[1100px] border border-border rounded-2xl bg-card/70 backdrop-blur-sm px-8 py-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border flex-none" style={{ background: "transparent" }}>
                {row?.mvp_player_avatar_url ? (
                  <img
                    src={row.mvp_player_avatar_url}
                    alt={row?.mvp_player_name ? `Foto ${row.mvp_player_name}` : "Foto do MVP"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>

              {showLogo ? (
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-border flex-none" style={{ background: "transparent" }}>
                  {row?.team_logo ? (
                    <img
                      src={row.team_logo}
                      alt={row?.team_name ? `Logo ${row.team_name}` : "Logo da equipe"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.18em] font-extrabold opacity-80">
                  MVP
                </div>
                <div
                  className="font-black whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ fontSize: font + 6 }}
                >
                  {row?.team_name || "—"}
                </div>
                <div className="mt-1 text-sm opacity-80">
                  {row?.team_tag ? `[${row.team_tag}]` : ""}
                </div>
                <div className="mt-1 text-sm opacity-90">
                  {row?.mvp_player_name ? (
                    <span>
                      Jogador <span className="font-semibold">{row.mvp_player_name}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-none">
              <div className="rounded-full border border-border bg-muted/30 px-4 py-2 text-sm">
                Rank <span className="font-black" style={{ fontSize: font }}>{row ? row.rank : "—"}</span>
              </div>
              <div className="rounded-full border border-border bg-muted/30 px-4 py-2 text-sm">
                Kills{" "}
                <span className="font-black" style={{ fontSize: font }}>
                  {row ? (row.mvp_player_kills ?? row.kills) : "—"}
                </span>
              </div>
              <div className="rounded-full border border-border bg-muted/30 px-4 py-2 text-sm">
                Pts <span className="font-black" style={{ fontSize: font }}>{row ? row.points : "—"}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] opacity-70">{status}</div>
        </div>
      </div>
    </div>
  );
}
