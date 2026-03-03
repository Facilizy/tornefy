import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, ExternalLink, Sparkles } from "lucide-react";

const GEMINI_URL = "https://gemini.google.com/";

const PROMPT_TEXT = `Instruções de Sistema: "Você é um motor de OCR especializado em Free Fire. Sua missão é extrair os dados dos slots preservando a identidade visual dos jogadores, enquanto identifica a lógica de grupo para automação de tabelas."

Regras de Extração e Identidade:

Preservação de Nomes (IMPORTANTE): Extraia o nome dos jogadores exatamente como aparecem (incluindo a Tag de Clã), removendo apenas emojis e símbolos não alfanuméricos que possam quebrar o JSON. Não remova a tag do nome do jogador. (Ex: JEG Yeshua deve permanecer assim).

Identificação de Identidade (team_tag / sigla):
* Analise os nomes no slot para identificar a Tag predominante (prefixo comum a 2 ou mais jogadores).
* Se não houver maioria, use a tag do jogador mais ativo ou o nome do jogador mais simples como referência de equipe.

Nomenclatura do Slot (team_name / equipe): Use o nome da equipe fornecido na lista de referência. Se não houver lista, use o padrão SLOT X ou SX.

Filtro de Ruído: Ignore o chat e IDs, a menos que haja uma instrução específica de erro de posição mencionada nas mensagens.

Formato de Saída (JSON Puro):

{
  "slots": [
    {
      "slot": 1,
      "team_name": "NOME DA EQUIPE (ou SLOT 1)",
      "team_tag": "TAG_IDENTIFICADA",
      "jogadores": [
        "TAG JOGADOR 1",
        "TAG JOGADOR 2",
        "TAG JOGADOR 3",
        "TAG JOGADOR 4"
      ],
      "aliases_suportados": ["nome", "name", "time", "equipe", "tag", "sigla", "clan_tag"]
    }
  ]
}

Lista de Referência de Slots: [COLE AQUI A LISTA DE EQUIPES]`;

export function ExternalTeamsPromptStep({ onNext }: { onNext: () => void }) {
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT_TEXT);
      toast.success("Prompt copiado!");
    } catch {
      toast.error("Não foi possível copiar o prompt");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/60 border-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base uppercase tracking-tight">
            <Sparkles className="h-4 w-4 text-primary" />
            Etapa 1 — Copiar o prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Copie o prompt abaixo e já tenha os prints dos 12 slots em mãos. Depois, cole no Gemini.
          </p>

          <Textarea value={PROMPT_TEXT} readOnly className="min-h-[240px] font-mono text-xs bg-background/30" />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={copyPrompt} className="gap-2">
                <Copy className="h-4 w-4" />
                Copiar prompt
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.open(GEMINI_URL, "_blank", "noopener,noreferrer")}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir Gemini
              </Button>
            </div>

            <Button onClick={onNext} className="sm:min-w-[180px]">
              Já copiei, continuar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="bg-card/40 border-border">
        <CardContent className="pt-6">
          <p className="text-sm">
            <span className="font-semibold">Etapa 2 — Sugestão:</span> use o Gemini para fazer a separação.
            <span className="text-muted-foreground"> Não se preocupe: é 100% gratuito.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
