import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileJson, ArrowLeft } from "lucide-react";

export function ExternalTeamsPasteJsonStep({
  rawJson,
  setRawJson,
  onLoad,
  onBack,
}: {
  rawJson: string;
  setRawJson: (v: string) => void;
  onLoad: () => void;
  onBack: () => void;
}) {
  return (
    <Card className="bg-card/60 border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base uppercase tracking-tight">
          <FileJson className="h-4 w-4 text-primary" />
          Etapa 3 — Colar o JSON
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>JSON gerado no Gemini</Label>
          <Textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            placeholder='Cole aqui o JSON no formato: { "slots": [ {"slot":1,"equipe_referencia":"...","jogadores":[...]}, ... ] }'
            className="min-h-[220px] font-mono text-xs bg-background/30"
          />
          <p className="text-xs text-muted-foreground">
            Dica: o slot pode vir com <span className="font-medium">equipe_referencia</span> e a lista em
            <span className="font-medium"> jogadores</span>.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={onLoad} className="sm:min-w-[220px]">
            Carregar e revisar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
