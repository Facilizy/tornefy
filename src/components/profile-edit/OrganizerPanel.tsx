import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Gamepad2, ArrowRight } from "lucide-react";

export function OrganizerPanel({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  return (
    <Card className="p-5 bg-card/40 border-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black uppercase">Organizador</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie suas scrims e acompanhe inscrições.</p>
        </div>
        <Button type="button" onClick={onOpenDashboard} className="shrink-0">
          Minhas scrims
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background/20 p-4">
          <p className="text-sm font-semibold">Criar e administrar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse seu painel para criar scrims, editar regras, slots e publicar links.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/20 p-4">
          <p className="text-sm font-semibold">Acompanhar ao vivo</p>
          <p className="mt-1 text-sm text-muted-foreground">Veja check-ins, times confirmados e operações em tempo real.</p>
        </div>
      </div>
    </Card>
  );
}
