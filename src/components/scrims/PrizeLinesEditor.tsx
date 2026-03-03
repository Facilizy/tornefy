import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Trophy } from "lucide-react";

type PrizeRow = {
  id: string;
  label: string;
  amount: string; // keep as text for input
};

function normalizeLines(value: string): string[] {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

const DEFAULT_ROWS: PrizeRow[] = [
  { id: "1", label: "1º lugar", amount: "" },
  { id: "2", label: "2º lugar", amount: "" },
  { id: "3", label: "3º lugar", amount: "" },
  { id: "mvp", label: "MVP", amount: "" },
];

function parseRowsFromText(text: string): PrizeRow[] {
  const lines = normalizeLines(text);
  if (lines.length === 0) return DEFAULT_ROWS.map((r) => ({ ...r, id: crypto.randomUUID() }));

  const rows: PrizeRow[] = [];

  for (const line of lines) {
    // matches: "label - 100", "label: 100", "label 100 tc"
    const m = line.match(/^(.*?)(?:\s*[-:]\s*|\s+)(\d+)\s*(?:tc|tornecoins)?\s*$/i);
    if (m) {
      rows.push({ id: crypto.randomUUID(), label: m[1].trim(), amount: String(Number(m[2])) });
    } else {
      rows.push({ id: crypto.randomUUID(), label: line.trim(), amount: "" });
    }
  }

  return rows.length > 0 ? rows : DEFAULT_ROWS.map((r) => ({ ...r, id: crypto.randomUUID() }));
}

function formatTextFromRows(rows: PrizeRow[]): string {
  return rows
    .map((r) => {
      const label = r.label.trim();
      const amt = String(r.amount ?? "").replace(/[^0-9]/g, "");
      if (!label) return null;
      if (!amt) return label;
      return `${label} - ${Number(amt)} TC`;
    })
    .filter(Boolean)
    .join("\n");
}

function sumRows(rows: PrizeRow[]): number {
  return rows.reduce((acc, r) => {
    const amt = Number(String(r.amount ?? "").replace(/[^0-9]/g, ""));
    if (!Number.isFinite(amt)) return acc;
    return acc + Math.max(0, Math.trunc(amt));
  }, 0);
}

export function PrizeLinesEditor({
  value,
  onChange,
  prizeCoins,
  onPrizeCoinsChange,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  prizeCoins?: number;
  onPrizeCoinsChange?: (next: number) => void;
  className?: string;
}) {
  const [rows, setRows] = useState<PrizeRow[]>(() => parseRowsFromText(value));
  const [autoSum, setAutoSum] = useState(true);

  const didInit = useRef(false);

  // keep editor in sync when external value changes (ex: editing another scrim)
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      setRows(parseRowsFromText(value));
      return;
    }
    setRows(parseRowsFromText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const computedTotal = useMemo(() => sumRows(rows), [rows]);

  useEffect(() => {
    if (!autoSum) return;
    onPrizeCoinsChange?.(computedTotal);
  }, [autoSum, computedTotal, onPrizeCoinsChange]);

  const commit = (nextRows: PrizeRow[]) => {
    setRows(nextRows);
    onChange(formatTextFromRows(nextRows));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Premiação por colocação</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Digite os valores (TC) por linha — isso vira a lista no botão “Premiação” do scrim.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() =>
            commit([
              ...rows,
              { id: crypto.randomUUID(), label: "", amount: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/50">
        <div className="grid grid-cols-[1fr_120px_44px] gap-2 border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
          <div>Colocação</div>
          <div className="text-right">TC</div>
          <div />
        </div>

        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_120px_44px] items-center gap-2 px-3 py-2">
              <Input
                value={r.label}
                onChange={(e) =>
                  commit(rows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))
                }
                placeholder="ex: 1º lugar, MVP"
              />
              <Input
                inputMode="numeric"
                className="text-right"
                value={r.amount}
                onChange={(e) =>
                  commit(
                    rows.map((x) =>
                      x.id === r.id
                        ? { ...x, amount: e.target.value.replace(/[^0-9]/g, "") }
                        : x,
                    ),
                  )
                }
                placeholder="0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => commit(rows.filter((x) => x.id !== r.id))}
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <Label className="text-xs text-muted-foreground">Somar total automaticamente</Label>
            <Switch checked={autoSum} onCheckedChange={setAutoSum} />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm sm:justify-end">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">
              {(autoSum ? computedTotal : Number(prizeCoins ?? 0)).toLocaleString("pt-BR")} TC
            </span>
          </div>
        </div>
      </div>

      {!autoSum ? (
        <div className="rounded-lg border border-border bg-background/30 p-3">
          <Label className="text-xs text-muted-foreground">Premiação total (manual)</Label>
          <Input
            className="mt-2"
            inputMode="numeric"
            value={String(prizeCoins ?? 0)}
            onChange={(e) => {
              const raw = Number(String(e.target.value).replace(/[^0-9]/g, ""));
              const next = Number.isFinite(raw) ? Math.max(0, Math.min(999999, Math.trunc(raw))) : 0;
              onPrizeCoinsChange?.(next);
            }}
          />
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Dica: você pode colocar só texto (ex: “Trofeu + Pix”) deixando TC vazio.
      </p>
    </div>
  );
}
