import { Card } from "@/components/ui/card";
import { FileText, Target, HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="space-y-4">
      {/* Scoring Card */}
      <Card className="p-4 bg-muted/30 border-border">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Sistema de Pontuação</h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-primary/10">
            <span className="text-sm text-muted-foreground">Abates:</span>
            <span className="font-bold text-primary">{pointsPerKill} pt(s)</span>
          </div>
          {pointsPerPositionText && (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {pointsPerPositionText}
            </div>
          )}
          {!pointsPerPositionText && (
            <p className="text-sm text-muted-foreground italic">
              Tabela de pontos não definida
            </p>
          )}
        </div>
      </Card>

      {/* Rules Card */}
      {rules && (
        <Card className="p-4 bg-muted/30 border-border">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Regras do Treino</h4>
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto pr-2">
            {rules}
          </div>
        </Card>
      )}

      {/* Help Card */}
      <Card className="p-4 bg-muted/30 border-border">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Ajuda</h4>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">Como funciona?</p>
            <p className="text-muted-foreground">
              Inscreva sua equipe e aguarde o início. Acompanhe o chat para informações.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Onde encontrar a sala?</p>
            <p className="text-muted-foreground">
              O organizador compartilhará os dados no chat ou Discord.
            </p>
          </div>
          {discordLink && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 gap-2"
              onClick={() => window.open(discordLink, "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              Entrar no Discord
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EventInfoSection;
