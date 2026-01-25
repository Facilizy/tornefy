import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Users, Monitor, Gamepad2, Handshake } from "lucide-react";
import { getGameLabel, getGameLogo } from "@/lib/games";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";
import { OrganizerBadge } from "@/components/OrganizerBadge";
import { DynamicBanner } from "@/components/DynamicBanner";
import TornefyBannerMark from "@/components/TornefyBannerMark";

import { useNavigate } from "react-router-dom";

interface TrainingCardProps {
  training: {
    id: string;
    name: string;
    banner_url?: string;
    primary_color?: string | null;
    secondary_color?: string | null;
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
    organizer_verified?: boolean;
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

  const gameLabel = training.game ? getGameLabel(training.game) : undefined;
  const gameLogo = training.game ? getGameLogo(training.game) : undefined;
  const organizerLabel = training.organizer_name ? `Criado por ${training.organizer_name}` : undefined;
  const showOrganizerVerified = !!training.organizer_name && !!training.organizer_verified;

  const normalizedStatus = (training.status || "").trim().toUpperCase();
  const isRegistrationsOpen = !training.status || normalizedStatus === "INSCRIÇÕES ABERTAS";
  const isOpen = availableSlots > 0;

  return (
    <Card className="group h-full overflow-hidden bg-card/60 border-border hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5">
      {/* Banner */}
      <DynamicBanner
        bannerUrl={training.banner_url}
        title={`Banner da scrim ${training.name}`}
        primaryColor={training.primary_color}
        secondaryColor={training.secondary_color}
        heightClassName="h-56"
        className="rounded-none"
        fallback={<TornefyBannerMark className="w-44 text-foreground/10" />}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-primary/20 via-transparent to-transparent" />

        {/* Status and Live Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            {isRegistrationsOpen ? (
              <Badge
                variant="outline"
                className={
                  isOpen
                    ? "pointer-events-none rounded-full border-status-open/50 bg-status-open/80 text-foreground"
                    : "pointer-events-none rounded-full border-status-closed/50 bg-status-closed/80 text-foreground"
                }
              >
                {isOpen ? "INSCRIÇÕES ABERTAS" : "LOTADO"}
              </Badge>
            ) : (
              <TrainingStatusBadge status={training.status} showFallback={false} />
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
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
              <span className="truncate">{organizerLabel}</span>
              {showOrganizerVerified ? (
                <OrganizerBadge verified variant="icon" size="sm" />
              ) : null}
            </p>
          )}
        </div>
      </DynamicBanner>

      {/* Content */}
      <div className="p-4 space-y-4 flex flex-col">
        <div className="space-y-2 flex-1">
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
            <Badge variant="outline">
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
        <Button
          onClick={() => navigate(`/training/${training.id}`)}
          className="w-full mt-auto"
          size="lg"
        >
          Ver Detalhes
        </Button>
      </div>
    </Card>
  );
};

export default TrainingCard;

