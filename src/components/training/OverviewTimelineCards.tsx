import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Flag, Hourglass, Radio } from "lucide-react";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";

type TrainingLike = {
  datetime: string;
  status?: string | null;
  rounds?: number | null;
};

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function statusStep(status?: string | null) {
  const s = (status || "INSCRIÇÕES ABERTAS").toUpperCase();
  if (s.includes("FINAL")) return 4;
  if (s.includes("ANDAMENTO")) return 3;
  if (s.includes("ENCERRADAS")) return 2;
  return 1;
}

export function TrainingTimelineCountdownCards({
  training,
  now,
}: {
  training: TrainingLike;
  now: Date;
}) {
  const startAt = useMemo(() => new Date(training.datetime), [training.datetime]);
  const diff = startAt.getTime() - now.getTime();
  const step = statusStep(training.status);

  const countdownLabel = diff > 0 ? formatCountdown(diff) : "Iniciado";
  const countdownSub = diff > 0 ? "Começa em" : "Status";

  const steps = [
    { key: "open", label: "Inscrições", value: "Abertas", n: 1 },
    { key: "closed", label: "Inscrições", value: "Encerradas", n: 2 },
    { key: "live", label: "Treino", value: "Em andamento", n: 3 },
    { key: "done", label: "Treino", value: "Finalizado", n: 4 },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="p-4 bg-background/50 border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-4 h-4" />
          {countdownSub}
        </div>
        <div className="mt-2 text-lg font-bold">{countdownLabel}</div>
        <div className="mt-1 text-xs text-muted-foreground">Horário do treino: {startAt.toLocaleString("pt-BR")}</div>
      </Card>

      <Card className="p-4 bg-background/50 border">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">Timeline</div>
          <TrainingStatusBadge status={training.status} />
        </div>

        <Separator className="my-3" />

        <div className="grid grid-cols-4 gap-2">
          {steps.map((s) => {
            const active = step === s.n;
            const passed = step > s.n;
            return (
              <div
                key={s.key}
                className={`rounded-lg border p-2 text-center ${
                  active ? "bg-card" : "bg-background/40"
                }`}
              >
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
                <div className="text-xs font-semibold">{s.value}</div>
                <div className="mt-1 flex justify-center">
                  {active ? (
                    <Radio className="w-3 h-3 text-primary" />
                  ) : passed ? (
                    <Flag className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Hourglass className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function NextDropsCard({
  rounds,
  status,
}: {
  rounds: number;
  status?: string | null;
}) {
  const s = (status || "INSCRIÇÕES ABERTAS").toUpperCase();
  const isLive = s.includes("ANDAMENTO");
  const isDone = s.includes("FINAL");

  const drops = Array.from({ length: Math.max(1, rounds || 1) }).map((_, i) => {
    const n = i + 1;
    let label = "Aguardando";
    let variant: "outline" | "secondary" = "outline";

    if (isDone) {
      label = "Concluída";
      variant = "secondary";
    } else if (isLive && n === 1) {
      label = "Em andamento";
      variant = "secondary";
    }

    return { n, label, variant };
  });

  return (
    <Card className="p-6 bg-card/80 border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold">Próximas quedas</h3>
          <p className="text-xs text-muted-foreground">Status por rodada (estimativa simples).</p>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {drops.map((d) => (
          <div key={d.n} className="rounded-lg border bg-background/50 p-3 flex items-center justify-between">
            <div className="font-semibold text-sm">Queda #{d.n}</div>
            <Badge variant={d.variant} className="text-xs">
              {d.label}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
