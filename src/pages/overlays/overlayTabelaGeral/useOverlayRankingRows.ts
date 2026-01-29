import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { RankRow } from "./types";

const VIEW_NAME = "vw_tornefy_ranking";
const POLL_MS = 10_000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashRows(rows: RankRow[]) {
  return JSON.stringify(
    rows.map((r) => [r.rank, r.team_tag, r.team_name, r.team_logo, r._wins, r._matches, r.kills, r.points, r._isPlaceholder])
  );
}

function normalizeRowsToRanks(rows: RankRow[], limit: number): RankRow[] {
  // Monta a lista 1..limit; se faltar um rank, cria placeholder mantendo o número.
  const byRank = new Map<number, RankRow>();
  rows.forEach((r) => {
    const rk = Number(r.rank);
    if (Number.isFinite(rk) && rk > 0) byRank.set(rk, r);
  });

  const out: RankRow[] = [];
  for (let i = 1; i <= limit; i++) {
    const found = byRank.get(i);
    if (found) out.push(found);
    else {
      out.push({
        rank: i,
        team_name: "",
        team_tag: null,
        team_logo: null,
        points: 0,
        kills: 0,
        _matches: undefined,
        _wins: undefined,
        _isPlaceholder: true,
      });
    }
  }
  return out;
}

export function useOverlayRankingRows() {
  const [qs] = useSearchParams();

  const treinoId = qs.get("treino_id") || "";
  const quedaId = qs.get("queda_id") || "";
  const rodadaId = qs.get("rodada_id") || "";

  const limitRaw = Number(qs.get("limit") || "8");
  // Quantidade de linhas (equipes)
  const limit = Number.isFinite(limitRaw) ? clamp(limitRaw, 1, 24) : 8;

  const colsRaw = Number(qs.get("cols") || "2");
  const cols = colsRaw === 1 ? 1 : 2;

  const gapRaw = Number(qs.get("gap") || "48");
  const gap = Number.isFinite(gapRaw) ? clamp(gapRaw, 0, 200) : 48;

  const fontRaw = Number(qs.get("font") || "18");
  const font = Number.isFinite(fontRaw) ? clamp(fontRaw, 12, 28) : 18;

  const showLogo = (qs.get("logo") ?? "1") !== "0";

  const showHeader = (qs.get("header") ?? "1") !== "0";

  const showMatches = (qs.get("matches") ?? "0") === "1";
  const showWins = (qs.get("wins") ?? "0") === "1";
  // defaults da view atual
  const matchesCol = (qs.get("matches_col") || "matches_played").trim();
  const winsCol = (qs.get("wins_col") || "wins").trim();
  const shouldMatches = showMatches;
  const shouldWins = showWins;

  const [rows, setRows] = useState<RankRow[]>([]);
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

        // vw_tornefy_ranking contém 3 níveis (geral/rodada/queda).
        if (quedaId) {
          query = query.eq("queda_id", quedaId);
          if (rodadaId) query = query.eq("rodada_id", rodadaId);
        } else if (rodadaId) {
          query = query.is("queda_id", null).eq("rodada_id", rodadaId);
        } else {
          query = query.is("queda_id", null).is("rodada_id", null);
        }

         // Importante: precisamos de todos os ranks até o limite para preencher "buracos".
         const { data, error } = await query.limit(Math.max(limit, 64));
        if (error) throw error;

        const raw: unknown[] = Array.isArray(data) ? (data as unknown[]) : [];
        const parsed: RankRow[] = raw.map((item) => {
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
        });

        const next = normalizeRowsToRanks(parsed, limit);
        const h = hashRows(next);
        if (h !== lastHash.current) {
          lastHash.current = h;
          if (mounted) setRows(next);
        }

        if (mounted) {
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
   }, [treinoId, quedaId, rodadaId, limit, shouldMatches, shouldWins, matchesCol, winsCol]);

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

  return {
    limit,
    cols,
    gap,
    font,
    showLogo,
    showHeader,
    shouldMatches,
    shouldWins,
    leftRows,
    rightRows,
    status,
  };
}
