import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, RefreshCcw, Users } from "lucide-react";

export type TournamentRegistrationRow = {
  id: string;
  tournament_id: string;
  team_id: string;
  status: string;
  paid_amount_coins: number;
  created_at: string;
  teams?: {
    id: string;
    name: string | null;
    tag: string | null;
    logo_url: string | null;
  } | null;
};

function escapeCsv(value: unknown) {
  const s = String(value ?? "");
  if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TournamentRegistrationsPanel({
  tournamentId,
  canManage,
  canView,
}: {
  tournamentId: string;
  canManage: boolean;
  canView: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TournamentRegistrationRow[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const fetchRows = useCallback(async () => {
    if (!canManage && !canView) return;
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("tournament_registrations")
        .select(
          "id,tournament_id,team_id,status,paid_amount_coins,created_at, teams(id,name,tag,logo_url)"
        )
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data || []) as TournamentRegistrationRow[]);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar inscritos");
    } finally {
      setLoading(false);
    }
  }, [canManage, canView, tournamentId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;

      const name = (r.teams?.name || "").toLowerCase();
      const tag = (r.teams?.tag || "").toLowerCase();
      return name.includes(q) || tag.includes(q);
    });
  }, [rows, filter, query]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const handleExportCsv = () => {
    if (!canManage) return;

    const headers = [
      "created_at",
      "status",
      "paid_amount_coins",
      "team_name",
      "team_tag",
      "team_id",
      "registration_id",
    ];

    const lines = [headers.join(",")].concat(
      filtered.map((r) => {
        const values = [
          r.created_at,
          r.status,
          r.paid_amount_coins,
          r.teams?.name || "",
          r.teams?.tag || "",
          r.team_id,
          r.id,
        ].map(escapeCsv);
        return values.join(",");
      })
    );

    const csv = lines.join("\n");
    const safeId = String(tournamentId).slice(0, 8);
    downloadCsv(`inscritos_torneio_${safeId}.csv`, csv);
  };

  if (!canManage && !canView) return null;

  return (
    <Card className="p-5 bg-card/50 border-border">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-black uppercase tracking-wide">Inscritos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} inscriç{rows.length === 1 ? "ão" : "ões"}
            {filter !== "all" || query.trim() ? (
              <>
                {" "}• {filtered.length} filtrad{filtered.length === 1 ? "o" : "os"}
              </>
            ) : null}
            {!canManage ? <> • visualização</> : null}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="min-w-[220px]">
            <Label htmlFor="tournament-registration-search" className="sr-only">
              Buscar por nome ou tag
            </Label>
            <Input
              id="tournament-registration-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou tag…"
              className="bg-background/40"
            />
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px] bg-background/40">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>

          {canManage ? (
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={loading || filtered.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          ) : null}

          <Button variant="outline" onClick={fetchRows} disabled={loading} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando inscritos…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum inscrito encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const teamName = r.teams?.name || "Equipe";
            const teamTag = r.teams?.tag || "—";
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/30 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="font-semibold truncate">{teamName}</div>
                    <div className="text-xs text-muted-foreground truncate">[{teamTag}]</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(r.created_at))}
                  </div>
                </div>

                <Badge variant="secondary" className="uppercase tracking-wide">
                  {r.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
