import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Monitor,
  Gamepad2,
  Smartphone,
  MonitorSmartphone,
} from "lucide-react";
import { getGameLabel, getGameLogo } from "@/lib/games";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";
import { OrganizerBadge } from "@/components/OrganizerBadge";
import { DynamicBanner } from "@/components/DynamicBanner";
import TornefyBannerMark from "@/components/TornefyBannerMark";
import { ScrimPaymentBadges } from "@/components/scrims/ScrimPaymentBadges";

import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface TrainingCardProps {
  training: {
    id: string;
    name: string;
    kind?: "training" | "tournament" | string;
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
    entry_fee_coins?: number | null;
    prize_coins?: number | null;
    prize?: string | null;
  };
}

const TrainingCard = ({ training }: TrainingCardProps) => {
  const navigate = useNavigate();
  const registrationsCount = training.registrations || 0;
  const availableSlots = training.max_slots - registrationsCount;

  const logoToastRef = useRef<ReturnType<typeof toast> | null>(null);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Mobile":
        return <Smartphone className="w-4 h-4" />;
      case "PC":
        return <Monitor className="w-4 h-4" />;
      case "Misto":
        return <MonitorSmartphone className="w-4 h-4" />;
      case "Console":
      case "console":
        return <Gamepad2 className="w-4 h-4" />;
      default:
        return <MonitorSmartphone className="w-4 h-4" />;
    }
  };

  const gameLabel = training.game ? getGameLabel(training.game) : undefined;
  const gameLogo = training.game ? getGameLogo(training.game) : undefined;
  const organizerLabel = training.organizer_name ? `Criado por ${training.organizer_name}` : undefined;
  const showOrganizerVerified = !!training.organizer_name && !!training.organizer_verified;

  const normalizedStatus = (training.status || "").trim().toUpperCase();
  const isRegistrationsOpen = !training.status || normalizedStatus === "INSCRIÇÕES ABERTAS";
  const isOpen = availableSlots > 0;

  // Não usar tudo em caixa alta (fica mais limpo)
  const kindLabel = training.kind === "tournament" ? "Torneio" : "Treino";

  return (
    <Card className="group h-full overflow-hidden bg-card/60 border-border hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5">
      {/* Imagem */}
      <DynamicBanner
        bannerUrl={training.banner_url}
        title={`Banner da scrim ${training.name}`}
        primaryColor={training.primary_color}
        secondaryColor={training.secondary_color}
        heightClassName="h-56"
        className="rounded-none"
        fallback={<TornefyBannerMark className="w-44 text-foreground/10" />}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />

        {/* Status no topo */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isRegistrationsOpen ? (
              <Badge
                variant="outline"
                className={
                  isOpen
                    ? "pointer-events-none rounded-full border-status-open/50 bg-status-open/70 text-foreground uppercase"
                    : "pointer-events-none rounded-full border-status-closed/50 bg-status-closed/70 text-foreground uppercase"
                }
              >
                {isOpen ? "INSCRIÇÕES ABERTAS" : "LOTADO"}
              </Badge>
            ) : (
              <TrainingStatusBadge status={training.status} showFallback={false} />
            )}
          </div>

          <div className="flex items-center gap-2">
            {training.is_live ? (
              <Badge className="bg-destructive/90 backdrop-blur-sm font-bold pointer-events-none uppercase">● AO VIVO</Badge>
            ) : null}

            {gameLogo ? (
              <img
                src={gameLogo}
                alt={`Logo do jogo ${gameLabel ?? ""}`.trim()}
                className="h-12 w-12 rounded-lg border border-border bg-background/40 object-contain p-2"
                loading="lazy"
                onMouseEnter={() => {
                  if (!gameLabel) return;
                  if (logoToastRef.current) return;

                  logoToastRef.current = toast({
                    title: gameLabel,
                  });
                }}
                onMouseLeave={() => {
                  if (!logoToastRef.current) return;
                  logoToastRef.current.dismiss();
                  logoToastRef.current = null;
                }}
              />
            ) : null}
          </div>
        </div>

        {/* Nome + organizador (sobre a imagem) */}
        <div className="absolute left-4 right-4 bottom-4">
          <h3 className="text-lg font-black text-foreground line-clamp-2 tracking-tight">{training.name}</h3>
          {organizerLabel && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground line-clamp-1">
              <span className="truncate">{organizerLabel}</span>
              {showOrganizerVerified ? <OrganizerBadge verified variant="icon" size="sm" /> : null}
            </p>
          )}
        </div>
      </DynamicBanner>

      {/* Conteúdo */}
      <div className="p-4 space-y-3 flex flex-col">
        {/* Infos principais */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {(() => {
                try {
                  return new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                    .format(new Date(training.datetime))
                    .replace(",", " às");
                } catch {
                  return "";
                }
              })()}
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

          {/* Chips compactos */}
          <div className="flex gap-2 flex-wrap pt-1">
            <Badge variant="secondary" className="flex items-center gap-1 uppercase bg-tag text-foreground px-2 py-0.5 text-[11px]">
              {getPlatformIcon(training.platform)}
              {training.platform}
            </Badge>

            <Badge variant="outline" className="border-border uppercase bg-tag text-foreground px-2 py-0.5 text-[11px]">
              {training.mode}
            </Badge>

            <Badge variant="outline" className="border-border uppercase bg-tag text-foreground px-2 py-0.5 text-[11px]">
              {kindLabel}
            </Badge>

            {gameLabel && (
              <Badge variant="outline" className="border-border uppercase bg-tag text-foreground px-2 py-0.5 text-[11px]">
                <span>{gameLabel}</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Inscrição + Premiação (mínimo, sem “card dentro de card”) */}
        <ScrimPaymentBadges
          entryFeeCoins={training.entry_fee_coins}
          prizeCoins={training.prize_coins}
          prizeText={training.prize}
          primaryColor={training.primary_color}
          secondaryColor={training.secondary_color}
        />

        {/* CTA */}
        <Button onClick={() => navigate(`/scrim/${training.id}`)} className="w-full mt-auto" size="lg">
          {isRegistrationsOpen && isOpen ? "Se inscrever" : "Ver detalhes"}
        </Button>
      </div>
    </Card>
  );
};

export default TrainingCard;
