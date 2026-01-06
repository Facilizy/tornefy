import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Target, HelpCircle } from "lucide-react";

interface EventInfoSectionProps {
  rules?: string;
  pointsPerKill: number;
  pointsPerPositionText?: string;
  discordLink?: string;
}

export const EventInfoSection = ({
  rules,
  pointsPerKill,
  pointsPerPositionText,
  discordLink,
}: EventInfoSectionProps) => {
  const [showRules, setShowRules] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const rulesCount = rules?.split("\n").filter((line) => line.trim()).length || 0;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRules(true)}
          className="flex-1 sm:flex-none gap-2 bg-card hover:bg-muted"
        >
          <FileText className="w-4 h-4" />
          Regras
          {rulesCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {rulesCount}
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowScoring(true)}
          className="flex-1 sm:flex-none gap-2 bg-card hover:bg-muted"
        >
          <Target className="w-4 h-4" />
          Pontuação
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHelp(true)}
          className="flex-1 sm:flex-none gap-2 bg-card hover:bg-muted"
        >
          <HelpCircle className="w-4 h-4" />
          Ajuda
        </Button>
      </div>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-lg max-h-[80vh] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Regras do Evento
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {rules ? (
              <div className="space-y-3">
                {rules.split("\n").map((line, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    {line || <br />}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma regra específica definida para este evento.
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Scoring Dialog */}
      <Dialog open={showScoring} onOpenChange={setShowScoring}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Sistema de Pontuação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-semibold text-primary mb-1">
                Pontos por Abate (Kill)
              </p>
              <p className="text-2xl font-bold">{pointsPerKill} pt(s)</p>
            </div>

            {pointsPerPositionText && (
              <div>
                <p className="text-sm font-semibold mb-2">Pontos por Colocação</p>
                <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm text-muted-foreground">
                  {pointsPerPositionText}
                </div>
              </div>
            )}

            {!pointsPerPositionText && (
              <p className="text-sm text-muted-foreground">
                Tabela de pontos por colocação não definida.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Ajuda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Como funciona?</h4>
              <p className="text-muted-foreground">
                Inscreva sua equipe e aguarde o início do evento. Acompanhe o chat para
                informações do organizador.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Onde encontrar a sala?</h4>
              <p className="text-muted-foreground">
                O organizador compartilhará os dados da sala no chat ou no Discord do evento.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Problemas?</h4>
              <p className="text-muted-foreground">
                Entre no Discord do evento e procure um administrador ou organizador.
              </p>
            </div>
            {discordLink && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(discordLink, "_blank")}
              >
                Entrar no Discord
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventInfoSection;
