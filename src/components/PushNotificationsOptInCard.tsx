import { BellRing, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePushOptIn } from "@/hooks/usePushOptIn";
import { VAPID_PUBLIC_KEY } from "@/lib/push";

export function PushNotificationsOptInCard({ userId }: { userId?: string }) {
  const { loading, status, error, enable, disable, supported } = usePushOptIn(userId);

  const enabled = status === "subscribed";

  return (
    <Card className="p-4 bg-card/50 border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" />
            <p className="font-semibold">Notificações Push</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Receba alertas de ranking, chat e eventos do treino. No iPhone, funciona melhor se
            instalar o app na Tela Inicial.
          </p>
        </div>

        {!supported ? (
          <Button type="button" variant="outline" disabled>
            Indisponível
          </Button>
        ) : enabled ? (
          <Button type="button" variant="outline" onClick={disable} disabled={loading}>
            Desativar
          </Button>
        ) : (
          <Button type="button" onClick={enable} disabled={loading || !userId || !VAPID_PUBLIC_KEY}>
            Ativar
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1">
          Status: {loading ? "carregando" : enabled ? "ativado" : "desativado"}
        </span>

        {!VAPID_PUBLIC_KEY && (
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1">
            <ShieldAlert className="w-3.5 h-3.5 text-primary" />
            Falta configurar VAPID
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </Card>
  );
}
