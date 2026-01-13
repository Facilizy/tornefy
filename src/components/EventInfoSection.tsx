import { Card } from "@/components/ui/card";
import { FileText, Target, HelpCircle, MessageCircle, Gamepad2, Monitor, Users, Trophy, Clock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  primaryColor?: string;
  // Training info
  platform?: string;
  mode?: string;
  game?: string;
  status?: string;
  maxSlots?: number;
  rounds?: number;
  datetime?: string;
}

const getGameLabel = (game?: string) => {
  const labels: Record<string, string> = {
    free_fire: "Free Fire",
    blood_strike: "Blood Strike",
    farlight_84: "Farlight 84",
    prime_rush: "Prime Rush",
    battlefield_6: "Battlefield 6"
  };
  return labels[game || ""] || game || "Não definido";
};

const getGameLogo = (game?: string) => {
  const logos: Record<string, string> = {
    free_fire: "/game-logos/free-fire.png",
    blood_strike: "/game-logos/blood-strike.png",
    farlight_84: "/game-logos/farlight-84.png",
    prime_rush: "/game-logos/prime-rush.png",
    battlefield_6: "/game-logos/battlefield-6.png"
  };
  return logos[game || ""] || null;
};

const getPlatformIcon = (platform?: string) => {
  if (platform === "Mobile") return <Smartphone className="w-4 h-4" />;
  if (platform === "PC") return <Monitor className="w-4 h-4" />;
  return <Gamepad2 className="w-4 h-4" />;
};

export const EventInfoSection = ({
  rules,
  pointsPerKill,
  pointsPerPosition,
  pointsPerPositionText,
  discordLink,
  primaryColor = "#9146FF",
  platform,
  mode,
  game,
  status,
  maxSlots,
  rounds,
  datetime,
}: EventInfoSectionProps) => {
  // Parse points_per_position array
  const positionPoints = pointsPerPosition && Array.isArray(pointsPerPosition) 
    ? pointsPerPosition.sort((a, b) => a.position - b.position)
    : [];

  return (
    <div className="space-y-4">
      {/* Training Info Card */}
      <Card className="p-4 bg-muted/30 border-border overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="w-4 h-4" style={{ color: primaryColor }} />
          <h4 className="font-semibold text-sm">Informações do Evento</h4>
        </div>
        
        {/* Game with Logo */}
        {game && (
          <div 
            className="flex items-center gap-3 p-3 rounded-lg mb-3"
            style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}30` }}
          >
            {getGameLogo(game) ? (
              <img 
                src={getGameLogo(game)!} 
                alt={getGameLabel(game)} 
                className="w-10 h-10 rounded-lg object-contain"
              />
            ) : (
              <Gamepad2 className="w-10 h-10" style={{ color: primaryColor }} />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Jogo</p>
              <p className="font-bold" style={{ color: primaryColor }}>{getGameLabel(game)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Platform */}
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            <div className="p-1.5 rounded" style={{ backgroundColor: `${primaryColor}20` }}>
              {getPlatformIcon(platform)}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Plataforma</p>
              <p className="text-xs font-semibold">{platform || "Misto"}</p>
            </div>
          </div>

          {/* Mode */}
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            <div className="p-1.5 rounded" style={{ backgroundColor: `${primaryColor}20` }}>
              <Users className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Modo</p>
              <p className="text-xs font-semibold">{mode || "Squad"}</p>
            </div>
          </div>

          {/* Max Slots */}
          {maxSlots && (
            <div className="flex items-center gap-2 p-2 rounded bg-background/50">
              <div className="p-1.5 rounded" style={{ backgroundColor: `${primaryColor}20` }}>
                <Users className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Máx. Times</p>
                <p className="text-xs font-semibold">{maxSlots}</p>
              </div>
            </div>
          )}

          {/* Rounds */}
          {rounds && (
            <div className="flex items-center gap-2 p-2 rounded bg-background/50">
              <div className="p-1.5 rounded" style={{ backgroundColor: `${primaryColor}20` }}>
                <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Rodadas</p>
                <p className="text-xs font-semibold">{rounds}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        {status && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Badge 
                variant={status === "INSCRIÇÕES ABERTAS" ? "default" : "secondary"}
                style={status === "INSCRIÇÕES ABERTAS" ? { backgroundColor: primaryColor } : {}}
              >
                {status}
              </Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Scoring Card - Visual Format */}
      <Card className="p-4 bg-muted/30 border-border">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4" style={{ color: primaryColor }} />
          <h4 className="font-semibold text-sm">Sistema de Pontuação</h4>
        </div>
        <div className="space-y-3">
          {/* Points per kill */}
          <div 
            className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}30` }}
          >
            <span className="text-sm text-muted-foreground">Abates:</span>
            <span className="font-bold text-lg" style={{ color: primaryColor }}>{pointsPerKill} pt(s)</span>
          </div>

          {/* Points per position - Visual Grid */}
          {positionPoints.length > 0 ? (
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
              {positionPoints.map((item) => (
                <div 
                  key={item.position}
                  className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-background/50 transition-colors"
                >
                  <span className="text-muted-foreground">
                    {item.position}º lugar:
                  </span>
                  <span className="font-semibold" style={{ color: primaryColor }}>
                    {item.points} pontos
                  </span>
                </div>
              ))}
            </div>
          ) : pointsPerPositionText ? (
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {pointsPerPositionText}
            </div>
          ) : (
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
            <FileText className="w-4 h-4" style={{ color: primaryColor }} />
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
          <HelpCircle className="w-4 h-4" style={{ color: primaryColor }} />
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
              style={{ borderColor: `${primaryColor}50`, color: primaryColor }}
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
