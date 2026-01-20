import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type RankRow = {
  rank: number;
  team_name: string;
  team_tag: string | null;
  team_logo: string | null;
  points: number;
  kills: number;
  [key: string]: any;
};

const VIEW_NAME = "vw_tornefy_ranking";
const POLL_MS = 10_000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isSafeIdent(s: string) {
  return /^[a-zA-Z0-9_]{1,60}$/.test(String(s || ""));
}

function isHexColor(s: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(s || ""));
}

function hashRows(rows: RankRow[]) {
  return JSON.stringify(
    rows.map((r) => [r.rank, r.team_tag, r.points, r.kills, r.team_logo, r._matches, r._wins])
  );
}

export default function OverlayTabelaGeral() {
  const [qs] = useSearchParams();

  const treinoId = qs.get("treino_id") || "";
  const quedaId = qs.get("queda_id") || "";
  const rodadaId = qs.get("rodada_id") || "";

  const limitRaw = Number(qs.get("limit") || "12");
  const limit = [8, 12, 16].includes(limitRaw) ? limitRaw : 12;

  const colsRaw = Number(qs.get("cols") || "2");
  const cols = colsRaw === 1 ? 1 : 2;

  const gapRaw = Number(qs.get("gap") || "48");
  const gap = Number.isFinite(gapRaw) ? clamp(gapRaw, 0, 200) : 48;

  const fontRaw = Number(qs.get("font") || "18");
  const font = Number.isFinite(fontRaw) ? clamp(fontRaw, 12, 28) : 18;

  const fontColorRaw = qs.get("font_color") || "";
  const fontColor = isHexColor(fontColorRaw) ? fontColorRaw : "";

  const showLogo = (qs.get("logo") ?? "1") !== "0";

  const showMatches = (qs.get("matches") ?? "0") === "1";
  const showWins = (qs.get("wins") ?? "0") === "1";
  const matchesCol = qs.get("matches_col") || "";
  const winsCol = qs.get("wins_col") || "";

  const shouldMatches = showMatches && isSafeIdent(matchesCol);
  const shouldWins = showWins && isSafeIdent(winsCol);

  const [rows, setRows] = useState<RankRow[]>([]);
  const lastHash = useRef<string>("");

  const leftRows = useMemo(() => {
    if (cols !== 2) return rows;
    const half = Math.ceil(rows.length / 2);
    return rows.slice(0, half);
  }, [rows, cols]);

  const rightRows = useMemo(() => {
    if (cols !== 2) return [];
    const half = Math.ceil(rows.length / 2);
    return rows.slice(half);
  }, [rows, cols]);

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    async function fetchOnce() {
      try {
        if (!treinoId) {
          if (mounted) setRows([]);
          return;
        }

        const selectParts = [
          "team_name",
          "team_tag",
          "team_logo",
          "rank",
          "points",
          "kills",
          "treino_id",
          "queda_id",
          "rodada_id",
        ];
        if (shouldMatches) selectParts.push(matchesCol);
        if (shouldWins) selectParts.push(winsCol);

        let query = (supabase as any)
          .from(VIEW_NAME)
          .select(selectParts.join(","))
          .eq("treino_id", treinoId);
        if (quedaId) query = query.eq("queda_id", quedaId);
        if (rodadaId) query = query.eq("rodada_id", rodadaId);

        const { data, error } = await query.limit(limit);
        if (error) throw error;

        const raw: unknown[] = Array.isArray(data) ? (data as unknown[]) : [];
        const next: RankRow[] = raw
          .map((item) => {
            const r = item as Record<string, any>;
            return {
              ...r,
              rank: Number(r.rank ?? 0),
              team_name: String(r.team_name ?? ""),
              team_tag: r.team_tag ?? null,
              team_logo: r.team_logo ?? null,
              points: Number(r.points ?? 0),
              kills: Number(r.kills ?? 0),
              _matches: shouldMatches ? r[matchesCol] : undefined,
              _wins: shouldWins ? r[winsCol] : undefined,
            } as RankRow;
          })
          .filter((r) => r.team_name);

        const h = hashRows(next);
        if (h !== lastHash.current) {
          lastHash.current = h;
          if (mounted) setRows(next);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }

    fetchOnce();
    timer = window.setInterval(fetchOnce, POLL_MS);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [
    treinoId,
    quedaId,
    rodadaId,
    limit,
    shouldMatches,
    shouldWins,
    matchesCol,
    winsCol,
  ]);

  const colLabel = (key: string) => {
    if (key === "rank") return "RANK";
    if (key === "team") return "EQUIPE";
    if (key === "points") return "PTS";
    if (key === "kills") return "ELIMS";
    if (key === "matches") return "PJ";
    if (key === "wins") return "VIT";
    return key.toUpperCase();
  };

  const headerCols: Array<{ key: string; className: string; align?: "left" | "right" }> = [
    { key: "rank", className: "w-[90px]" },
    { key: "team", className: "w-auto" },
    { key: "points", className: "w-[150px]", align: "right" },
    { key: "kills", className: "w-[150px]", align: "right" },
  ];
  if (showMatches) headerCols.push({ key: "matches", className: "w-[150px]", align: "right" });
  if (showWins) headerCols.push({ key: "wins", className: "w-[150px]", align: "right" });

  const Row = ({ r, first }: { r: RankRow; first: boolean }) => (
    <tr className={first ? "text-primary" : undefined}>
      <td className="py-3 pr-2 whitespace-nowrap overflow-hidden text-ellipsis">
        <span className="font-black" style={{ fontSize: font }}>
          {String(r.rank).padStart(2, "0")}.
        </span>
      </td>
      <td className="py-3 pr-2 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          {showLogo && (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-none">
              {r.team_logo ? (
                <img src={r.team_logo} alt={`Logo ${r.team_name}`} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
          )}
          <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="font-black" style={{ fontSize: font }}>
              {r.team_name}
            </span>
            {r.team_tag ? <span className="text-muted-foreground text-xs ml-2">[{r.team_tag}]</span> : null}
          </div>
        </div>
      </td>
      <td className="py-3 pr-2 text-right whitespace-nowrap">
        <span className="font-black" style={{ fontSize: font }}>
          {r.points}
        </span>
      </td>
      <td className="py-3 pr-2 text-right whitespace-nowrap">
        <span className="font-black" style={{ fontSize: font }}>
          {r.kills}
        </span>
      </td>
      {showMatches ? (
        <td className="py-3 pr-2 text-right whitespace-nowrap">
          <span className="font-black" style={{ fontSize: font }}>
            {r._matches ?? "—"}
          </span>
        </td>
      ) : null}
      {showWins ? (
        <td className="py-3 pr-2 text-right whitespace-nowrap">
          <span className="font-black" style={{ fontSize: font }}>
            {r._wins ?? "—"}
          </span>
        </td>
      ) : null}
    </tr>
  );

  const Table = ({ data, aria }: { data: RankRow[]; aria: string }) => (
    <table className="w-full table-fixed border-collapse" aria-label={aria}>
      <thead>
        <tr>
          {headerCols.map((c) => (
            <th
              key={c.key}
              className={`${c.className} pb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground font-extrabold ${
                c.align === "right" ? "text-right" : "text-left"
              } border-b border-border/40`}
            >
              {colLabel(c.key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((r, idx) => (
          <Row key={`${r.rank}-${r.team_name}-${r.team_tag ?? ""}`} r={r} first={idx === 0} />
        ))}
      </tbody>
    </table>
  );

  // Overlay canvas (1920x300) + fundo transparente
  return (
    <div
      style={{ width: 1920, height: 300, background: "transparent", color: fontColor || undefined }}
      className="overflow-hidden text-foreground"
    >
      <div
        className="w-full h-full grid items-start"
        style={{ gridTemplateColumns: cols === 2 ? "1fr 1fr" : "1fr", gap }}
      >
        <div className="w-full">
          <Table data={leftRows} aria="Tabela geral (coluna 1)" />
        </div>
        {cols === 2 ? (
          <div className="w-full">
            <Table data={rightRows} aria="Tabela geral (coluna 2)" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
