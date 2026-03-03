import { useMemo, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Target, HelpCircle, ChevronRight, Skull, Trophy, AlertCircle, MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { hexToHslTriplet } from "@/lib/color";

interface PointsPerPosition {
  position: number;
  points: number;
}

function normalizeLines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

interface EventInfoSectionProps {
  rules?: string;
  pointsPerKill: number;
  pointsPerPosition?: PointsPerPosition[];
  pointsPerPositionText?: string;
  discordLink?: string;
  whatsappLink?: string;
  primaryColor?: string;
  entryFeeCoins?: number | null;
  prizeCoins?: number | null;
  prizeText?: string | null;
}

export const EventInfoSection = ({
  rules,
  pointsPerKill,
  pointsPerPosition,
  pointsPerPositionText,
  discordLink,
  whatsappLink,
  primaryColor = "#9146FF",
  entryFeeCoins,
  prizeCoins,
  prizeText,
}: EventInfoSectionProps) => {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Parse points_per_position array (fallback: parse from pointsPerPositionText)
  const positionPoints = useMemo(() => {
    const arr = pointsPerPosition && Array.isArray(pointsPerPosition)
      ? pointsPerPosition
        .map((p) => ({ position: Number(p.position), points: Number(p.points) }))
        .filter((p) => Number.isFinite(p.position) && Number.isFinite(p.points))
      : [];

    if (arr.length > 0) return [...arr].sort((a, b) => a.position - b.position);

    if (pointsPerPositionText) {
      const lines = pointsPerPositionText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const parsed: PointsPerPosition[] = [];
      for (const line of lines) {
        const m = line.match(/^(\d+)(?:\s*[ºo])?(?:\s*lugar)?\s*:\s*(\d+)/i);
        if (!m) continue;
        parsed.push({ position: Number(m[1]), points: Number(m[2]) });
      }

      return parsed.sort((a, b) => a.position - b.position);
    }

    return [];
  }, [pointsPerPosition, pointsPerPositionText]);

  // Count rules lines for badge
  const rulesLineCount = rules ? rules.split('\n').filter(line => line.trim()).length : 0;

  const accent = useMemo(() => {
    try {
      return primaryColor ? hexToHslTriplet(primaryColor) : null;
    } catch {
      return null;
    }
  }, [primaryColor]);

  return (
    <div className="space-y-4">
      {/* Botões de Ação em 3 Colunas */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          onClick={() => setRulesOpen(true)}
          className="flex flex-col items-center justify-center p-2 h-auto aspect-square border-dashed hover:bg-muted/50 transition-all text-[11px] font-bold uppercase tracking-tight"
          style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
        >
          <FileText className="w-5 h-5 mb-1.5 opacity-80" />
          Regras
        </Button>
        <Button
          variant="outline"
          onClick={() => setScoringOpen(true)}
          className="flex flex-col items-center justify-center p-2 h-auto aspect-square border-dashed hover:bg-muted/50 transition-all text-[11px] font-bold uppercase tracking-tight"
          style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
        >
          <Target className="w-5 h-5 mb-1.5 opacity-80" />
          Pontos
        </Button>
        <Button
          variant="outline"
          onClick={() => setHelpOpen(true)}
          className="flex flex-col items-center justify-center p-2 h-auto aspect-square border-dashed hover:bg-muted/50 transition-all text-[11px] font-bold uppercase tracking-tight"
          style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
        >
          <HelpCircle className="w-5 h-5 mb-1.5 opacity-80" />
          Ajuda
        </Button>
      </div>

      {/* Rules Dialog */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent
          className="max-w-lg max-h-[80vh] overflow-y-auto bg-background border-border"
          style={
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--event-accent" as any]: accent || "var(--primary)",
            } as CSSProperties
          }
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-5 h-5 text-[hsl(var(--event-accent))]" />
              Regras da Scrim
            </DialogTitle>
          </DialogHeader>

          <div
            className="p-3 rounded-lg text-sm mb-4 border bg-[hsl(var(--event-accent)/0.08)] border-[hsl(var(--event-accent)/0.22)]"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[hsl(var(--event-accent))]" />
              <span className="font-medium text-[hsl(var(--event-accent))]">
                Leitura obrigatória antes do check-in
              </span>
            </div>
          </div>

          {rules ? (
            <div className="space-y-4 text-sm">
              {renderRulesCards(rules)}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Nenhuma regra definida para este treino.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Prize Dialog */}
      <Dialog open={prizeOpen} onOpenChange={setPrizeOpen}>
        <DialogContent
          className="max-w-lg max-h-[80vh] overflow-y-auto bg-background border-border"
          style={
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--event-accent" as any]: accent || "var(--primary)",
            } as CSSProperties
          }
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
              <Trophy className="w-5 h-5 text-[hsl(var(--event-accent))]" />
              Premiação
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const lines = normalizeLines(String(prizeText ?? "").trim());
            const totalPrize = Math.max(0, Math.trunc(Number(prizeCoins ?? 0)));
            const fee = Math.max(0, Math.trunc(Number(entryFeeCoins ?? 0)));

            return (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Entrada</span>
                    <span className="font-semibold text-foreground">
                      {fee > 0 ? `${fee.toLocaleString("pt-BR")} TC` : "Grátis"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Premiação total</span>
                    <span className="font-semibold text-foreground">
                      {totalPrize > 0 ? `${totalPrize.toLocaleString("pt-BR")} TC` : "—"}
                    </span>
                  </div>
                </div>

                {lines.length > 0 ? (
                  <ol className="space-y-2">
                    {lines.map((text, idx) => (
                      <li key={`${idx}-${text}`} className="flex items-start gap-3 rounded-xl border border-border bg-card/40 px-4 py-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background/40 text-xs font-black text-muted-foreground">
                          {idx + 1}
                        </div>
                        <p className="text-sm leading-relaxed font-medium text-foreground whitespace-pre-wrap">
                          {text}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma premiação detalhada cadastrada.</p>
                )}

                <p className="text-xs text-muted-foreground">
                  Dica: edite isso em Configurações → Premiação e Regras (uma linha por item).
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={scoringOpen} onOpenChange={setScoringOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
              <Target className="w-5 h-5" style={{ color: primaryColor }} />
              Como Funciona a Pontuação
            </DialogTitle>
          </DialogHeader>

          {/* Scoring explanation */}
          <div
            className="p-4 rounded-lg mb-4"
            style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}30` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Skull className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="font-semibold text-sm">SISTEMA DE PONTUAÇÃO</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A pontuação final é calculada somando os <strong className="text-foreground">pontos de colocação</strong> + <strong className="text-foreground">{pointsPerKill} ponto(s) por kill</strong> em cada partida.
            </p>
          </div>

          {/* Points per position grid */}
          {positionPoints.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Tabela de Pontos por Colocação
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {positionPoints.map((item, index) => (
                  <div
                    key={item.position}
                    className="text-center py-2 px-1 rounded-lg border border-border bg-card/50"
                  >
                    <div className="text-xs text-muted-foreground">{item.position}º</div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: index < 4 ? primaryColor : undefined }}
                    >
                      {item.points}pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Points per kill */}
          <div
            className="p-4 rounded-lg mb-4"
            style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}30` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Skull className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="font-semibold text-sm">PONTOS POR KILL</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Cada eliminação vale <strong className="text-foreground">+{pointsPerKill} ponto(s)</strong>. Os kills são somados à pontuação de colocação para o total final.
            </p>
          </div>

          {/* Example calculation */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Exemplo de Cálculo
            </h4>
            {(() => {
              const third = positionPoints.find((p) => p.position === 3)?.points ?? 0;
              const kills = 8;
              return (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>Colocação: 3º lugar = {third} pts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skull className="w-4 h-4" style={{ color: primaryColor }} />
                    <span>Kills do time: {kills} kills = {kills * pointsPerKill} pts</span>
                  </div>
                  <div className="border-t border-border mt-2 pt-2 font-bold">
                    Total da partida: {third + kills * pointsPerKill} pontos
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
              <HelpCircle className="w-5 h-5" style={{ color: primaryColor }} />
              Ajuda - Scrims
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground mb-4">Ações Rápidas</div>

          {discordLink && (
            <Button
              variant="outline"
              className="w-fit gap-2 mb-2"
              onClick={() => window.open(discordLink, "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              Entrar no Discord
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          {whatsappLink && (
            <Button
              variant="outline"
              className="w-fit gap-2 mb-4"
              onClick={() => window.open(whatsappLink, "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              Grupo no WhatsApp
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="checkin" className="border rounded-lg px-4 bg-card/50">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="font-semibold uppercase text-sm">Como Fazer Check-in</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm pb-4">
                Clique no botão "Inscrever Minha Equipe" na página do treino. Sua equipe precisa estar completa conforme o modo (Solo, Duo ou Squad).
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="team" className="border rounded-lg px-4 bg-card/50">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="font-semibold uppercase text-sm">Gerenciar Time</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm pb-4">
                Acesse "Minha Equipe" no menu para adicionar jogadores, editar informações e gerenciar convites.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="result" className="border rounded-lg px-4 bg-card/50">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5" style={{ color: primaryColor }} />
                  <span className="font-semibold uppercase text-sm">Informar Resultado</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm pb-4">
                Os resultados são gerenciados pelo organizador. Acompanhe a aba "Partidas" para ver posições e pontuações.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function renderRulesCards(rules: string) {
  const items = rules
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\s*[\.)-]\s*/, ""));

  return (
    <div className="space-y-3">
      {items.map((text, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border bg-card/40 px-4 py-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background/40 text-xs font-black text-muted-foreground">
              {idx + 1}
            </div>
            <p className="text-sm leading-relaxed font-medium text-foreground">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
