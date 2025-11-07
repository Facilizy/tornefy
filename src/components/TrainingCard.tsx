import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Monitor, Gamepad2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface TrainingCardProps {
  training: {
    id: string;
    name: string;
    banner_url?: string;
    datetime: string;
    platform: string;
    mode: string;
    game?: string;
    max_slots: number;
    registrations?: number;
    is_live?: boolean;
    status?: string;
    is_private?: boolean;
    invited_tags?: string[];
  };
}

const TrainingCard = ({ training }: TrainingCardProps) => {
  const navigate = useNavigate();
  const registrationsCount = training.registrations || 0;
  const availableSlots = training.max_slots - registrationsCount;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "PC":
        return <Monitor className="w-4 h-4" />;
      case "Mobile":
        return <Gamepad2 className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getGameLogo = (game?: string) => {
    const logos: Record<string, string> = {
      free_fire: "/game-logos/free-fire.png",
      blood_strike: "/game-logos/blood-strike.png",
      farlight_84: "/game-logos/farlight-84.png",
    };
    return game ? logos[game] : "";
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case "INSCRIÇÕES ABERTAS":
        return "default";
      case "INSCRIÇÕES ENCERRADAS":
        return "secondary";
      case "EM ANDAMENTO":
        return "outline";
      case "FINALIZADO":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Card className="group overflow-hidden backdrop-blur-sm bg-card/80 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-primary overflow-hidden">
        {training.banner_url ? (
          <img
            src={training.banner_url}
            alt={training.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users className="w-16 h-16 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Status and Live Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <div className="flex flex-col gap-1">
            {training.status && (
              <Badge 
                variant={getStatusVariant(training.status)}
                className="font-bold text-xs"
              >
                {training.status}
              </Badge>
            )}
            {training.is_private && (
              <Badge 
                variant="outline"
                className="font-bold text-xs border-yellow-500 text-yellow-600 bg-yellow-500/10"
              >
                {training.invited_tags && training.invited_tags.length > 0 
                  ? "Somente Convidados" 
                  : "Treino Privado"}
              </Badge>
            )}
          </div>
          {training.is_live && (
            <Badge className="bg-destructive/90 backdrop-blur-sm font-bold">
              ● AO VIVO
            </Badge>
          )}
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-xl text-white line-clamp-2 drop-shadow-lg">
            {training.name}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(training.datetime), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              <span
                className={`font-semibold ${
                  availableSlots > 5 ? "text-primary" : "text-destructive"
                }`}
              >
                {registrationsCount}/{training.max_slots}
              </span>
              {" "}equipes inscritas
            </span>
          </div>
        </div>

        {/* Mode, Platform and Game Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className="flex items-center gap-1"
          >
            {getPlatformIcon(training.platform)}
            {training.platform}
          </Badge>
          <Badge variant="outline" className="border-primary/30">
            {training.mode}
          </Badge>
          {training.game && (
            <Badge variant="default" className="bg-gradient-primary">
              {training.game === 'free_fire' && 'Free Fire'}
              {training.game === 'blood_strike' && 'Blood Strike'}
              {training.game === 'farlight_84' && 'Farlight 84'}
            </Badge>
          )}
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => navigate(`/training/${training.id}`)}
          className="w-full"
          size="lg"
        >
          Ver Detalhes
        </Button>
      </div>
    </Card>
  );
};

export default TrainingCard;
