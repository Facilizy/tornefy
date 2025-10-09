import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Card
      onClick={() => navigate(`/training/${training.id}`)}
      className="group cursor-pointer overflow-hidden backdrop-blur-sm bg-card/80 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow"
    >
      {/* Banner */}
      <div className="relative h-40 bg-gradient-primary overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Game Logo */}
        {training.game && getGameLogo(training.game) && (
          <img
            src={getGameLogo(training.game)}
            alt="Game logo"
            className="absolute top-2 left-2 w-12 h-12 object-contain"
          />
        )}
        
        {/* Live Badge */}
        {training.is_live && (
          <Badge className="absolute top-2 right-2 bg-destructive animate-pulse">
            🔴 AO VIVO
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {training.name}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            {format(new Date(training.datetime), "dd 'de' MMMM 'às' HH:mm", {
              locale: ptBR,
            })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-secondary/50"
            >
              {getPlatformIcon(training.platform)}
              {training.platform}
            </Badge>
            <Badge variant="outline" className="border-primary/30">
              {training.mode}
            </Badge>
          </div>

          <div className="text-sm">
            <span
              className={`font-semibold ${
                availableSlots > 5 ? "text-primary" : "text-destructive"
              }`}
            >
              {registrationsCount}/{training.max_slots}
            </span>
            <span className="text-muted-foreground ml-1">vagas</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TrainingCard;
