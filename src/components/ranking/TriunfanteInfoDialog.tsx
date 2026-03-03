import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RANK_TIERS, getTriunfanteCutoff } from "@/lib/ranking";

export function TriunfanteInfoDialog({
  totalPlayers,
  cutoffPoints,
  triggerText = "Regra do Triunfante",
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  totalPlayers: number;
  cutoffPoints: number | null;
  triggerText?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "link";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}) {
  const cutoffPos = getTriunfanteCutoff(totalPlayers);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entender o Ranking</DialogTitle>
          <DialogDescription>
            Patentes, requisitos e método de pontuação.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tiers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tiers">Patentes</TabsTrigger>
            <TabsTrigger value="scoring">Pontuação</TabsTrigger>
          </TabsList>

          <TabsContent value="tiers" className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <p className="font-semibold">Pontos mínimos por patente</p>
              <div className="mt-3 space-y-2">
                {RANK_TIERS.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2"
                  >
                    <span className="font-semibold">{t.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.id === "triunfante" ? "14.000+" : `${t.minPoints}+`} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card/40 p-4">
              <p className="font-semibold">Regra do Triunfante</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
                <li>Ter <strong>14.000+</strong> pontos na season</li>
                <li>
                  Ficar no <strong>Top {cutoffPos}</strong> (Top 3% ou Top 100 — o menor dos dois)
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card/40 p-4">
              <p className="font-semibold">Cutoff atual</p>
              <p className="mt-2 text-muted-foreground">
                {cutoffPoints === null
                  ? "Ainda não há jogadores suficientes para calcular o cutoff."
                  : `No momento, a posição #${cutoffPos} está com ${cutoffPoints} pontos.`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Observação: o cutoff muda conforme mais jogadores pontuam.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="scoring" className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <p className="font-semibold">Como ganha pontos</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
                <li>
                  <strong>+25</strong> por participação
                </li>
                <li>
                  <strong>+5</strong> por abate
                </li>
                <li>
                  <strong>+60</strong> por vitória (Top 1)
                </li>
                <li>
                  <strong>+20</strong> para Top 2-3
                </li>
                <li>
                  <strong>+10</strong> para Top 4-5
                </li>
                <li>
                  Abaixo do Top 5: perde <strong>2 pts</strong> por posição (cap em <strong>-10</strong>)
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card/40 p-4">
              <p className="font-semibold">Penalidades e limites</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
                <li>
                  <strong>-10</strong> para último lugar
                </li>
                <li>
                  <strong>-5</strong> para 0 abates
                </li>
                <li>
                  Limite de <strong>8 partidas ranqueadas por dia</strong> por jogador
                </li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                A pontuação é aplicada automaticamente quando a partida é marcada como finalizada.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
