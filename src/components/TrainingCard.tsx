import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Users, Monitor, Gamepad2, Handshake, Layers } from "lucide-react";

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
    rounds?: number | null;
    max_slots: number;
    registrations?: number;
    is_live?: boolean;
    status?: string;
    is_private?: boolean;
    invited_tags?: string[];
    organizer_name?: string | null;
    organizer_avatar_url?: string | null;
  };
}

const GAME_LABELS: Record<string, string> = {
  free_fire: "Free Fire",
  blood_strike: "Blood Strike",
  farlight_84: "Farlight 84",
  prime_rush: "Prime Rush",
  battlefield_6: "Battlefield 6",
};

const GAME_LOGOS: Record<string, string> = {
  free_fire: "/game-logos/free-fire.png",
  blood_strike: "/game-logos/blood-strike.png",
  farlight_84: "/game-logos/farlight-84.png",
  prime_rush: "/game-logos/prime-rush.png",
  battlefield_6: "/game-logos/battlefield-6.png",
};

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

  const gameLabel = training.game ? GAME_LABELS[training.game] : undefined;
  const gameLogo = training.game ? GAME_LOGOS[training.game] : undefined;
  const organizerLabel = training.organizer_name ? `Criado por ${training.organizer_name}` : undefined;

  return (
    <Card className="group overflow-hidden bg-card/70 border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-0.5">
      {/* Banner */}
      <div className="relative h-56 bg-gradient-primary overflow-hidden">
        {training.banner_url ? (
          <img
            src={training.banner_url}
            alt={`Banner da scrim ${training.name}`}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users className="w-16 h-16 text-foreground/10" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

        {/* Status and Live Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            {training.status && (
              <Badge variant={getStatusVariant(training.status)} className="font-bold text-xs">
                {training.status}
              </Badge>
            )}
            {training.is_private && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-help">
                      <Handshake className="w-3 h-3" />
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Somente convidados</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-2">
            {training.is_live && (
              <Badge className="bg-destructive/90 backdrop-blur-sm font-bold pointer-events-none">
                ● AO VIVO
              </Badge>
            )}
            {gameLogo && (
              <div className="h-9 w-9 rounded-xl bg-background/70 border border-border backdrop-blur-sm p-1.5">
                <img
                  src={gameLogo}
                  alt={`Logo do jogo ${gameLabel ?? ""}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-black text-xl text-foreground line-clamp-2 uppercase tracking-tight drop-shadow">
            {training.name}
          </h3>
          {organizerLabel && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{organizerLabel}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
                .format(new Date(training.datetime))
                .replace(",", " às")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              <span className={`font-semibold ${availableSlots > 5 ? "text-primary" : "text-destructive"}`}>
                {registrationsCount}/{training.max_slots}
              </span>{" "}
              equipes inscritas
            </span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="flex items-center gap-1">
            {getPlatformIcon(training.platform)}
            {training.platform}
          </Badge>

          <Badge variant="outline" className="border-primary/30">
            {training.mode}
          </Badge>

          {typeof training.rounds === "number" && training.rounds > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {training.rounds} rodada{training.rounds !== 1 ? "s" : ""}
            </Badge>
          )}

          {gameLabel && (
            <Badge variant="default" className="bg-gradient-primary">
              {gameLabel}
            </Badge>
          )}
        </div>

        {/* CTA Button */}
        <Button onClick={() => navigate(`/training/${training.id}`)} className="w-full" size="lg">
          Ver Detalhes
        </Button>
      </div>
    </Card>
  );
};

export default TrainingCard;
