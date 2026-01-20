import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Target, HelpCircle, ChevronRight, Skull, Trophy, AlertCircle, MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PointsPerPosition {
  position: number;
  points: number;
}

interface EventInfoSectionProps {
  rules?: string;
  pointsPerKill: number;
  pointsPerPosition?: PointsPerPosition[];
  pointsPerPositionText?: string;
  discordLink?: string;
  whatsappLink?: string;
  primaryColor?: string;
}

export const EventInfoSection = ({
  rules,
  pointsPerKill,
  pointsPerPosition,
  pointsPerPositionText,
  discordLink,
  whatsappLink,
  primaryColor = "#9146FF",
}: EventInfoSectionProps) => {
  const [rulesOpen, setRulesOpen] = useState(false);
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

  return (
    <>
      {/* Button Group */}
      <div className="flex flex-col w-full gap-3">
        <Button
          variant="outline"
          className="gap-2 w-full bg-card/50 border-border hover:bg-muted/50 text-foreground hover:text-foreground justify-center"
          onClick={() => setRulesOpen(true)}
        >
          <FileText className="w-4 h-4" />
          Regras
          {rulesLineCount > 0 && (
            <span className="text-xs text-muted-foreground">({rulesLineCount})</span>
          )}
        </Button>
        
        <Button
          variant="outline"
          className="gap-2 w-full bg-card/50 border-border hover:bg-muted/50 text-foreground hover:text-foreground justify-center"
          onClick={() => setScoringOpen(true)}
        >
          <Target className="w-4 h-4" />
          Pontuação
        </Button>
        
        <Button
          variant="outline"
          className="gap-2 w-full bg-card/50 border-border hover:bg-muted/50 text-foreground hover:text-foreground justify-center"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="w-4 h-4" />
          Ajuda
        </Button>
      </div>

      {/* Rules Dialog */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-5 h-5" style={{ color: primaryColor }} />
              Regras da Scrim
            </DialogTitle>
          </DialogHeader>
          
          <div 
            className="p-3 rounded-lg text-sm mb-4"
            style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}30` }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="font-medium" style={{ color: primaryColor }}>
                Leitura obrigatória antes do check-in
              </span>
            </div>
          </div>

          {rules ? (
            <div className="space-y-4 text-sm">
              {parseRulesIntoSections(rules)}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Nenhuma regra definida para este treino.
            </p>
          )}
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
    </>
  );
};

function parseRulesIntoSections(rules: string) {
  const lines = rules.split('\n').filter(line => line.trim());
  
  // Simple fallback: show as bullet list if no structured numbering
  const hasNumbering = lines.some(line => /^\d+\./.test(line.trim()));

  if (!hasNumbering) {
    return (
      <ul className="list-disc list-inside space-y-1">
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    );
  }

  // Group by top-level rule numbers (1., 2., 3., ...)
  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+)\.(.*)$/);

    if (match) {
      // New section
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: trimmed,
        items: [],
      };
    } else if (currentSection) {
      currentSection.items.push(trimmed);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div key={index} className="border border-border rounded-lg p-3 bg-card/50">
          <div className="flex items-start gap-2 mb-1">
            <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{index + 1}.</span>
            <p className="text-sm font-medium">{section.title.replace(/^\d+\.\s*/, "")}</p>
          </div>
          {section.items.length > 0 && (
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              {section.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
