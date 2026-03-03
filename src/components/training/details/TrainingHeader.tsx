import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Calendar,
    Clock,
    Monitor,
    Gamepad2,
    Share2,
    Settings,
    MonitorSmartphone,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { OrganizerBadge } from "@/components/OrganizerBadge";
import TrainingStatusBadge from "@/components/training/TrainingStatusBadge";
import { DynamicBanner } from "@/components/DynamicBanner";
import { ScrimPaymentBadges } from "@/components/scrims/ScrimPaymentBadges";
import { Training, OrganizerProfile } from "@/types/domain";
import { getGameLabel, getGameLogo } from "@/lib/games";

interface TrainingHeaderProps {
    training: Training;
    organizerProfile: OrganizerProfile | null;
    isVerifiedOrganizer: boolean;
    userRole: string | null;
    onFollowOrganizer: () => void;
    isFollowingOrganizer: boolean;
}

export const BANNER_SIZES = {
    CARD: { width: 400, height: 192, aspectRatio: "2.08:1" },
    PAGE: { width: 1920, height: 400, aspectRatio: "4.8:1" },
};

export function TrainingHeader({
    training,
    organizerProfile,
    isVerifiedOrganizer,
    userRole,
    onFollowOrganizer,
    isFollowingOrganizer,
}: TrainingHeaderProps) {
    const navigate = useNavigate();

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado para a área de transferência!");
    };

    const formattedDate = training.datetime ? (() => {
        try {
            return format(new Date(training.datetime), "EEE, dd 'de' MMMM", { locale: ptBR });
        } catch { return ""; }
    })() : "";

    const formattedTime = training.datetime ? (() => {
        try {
            return format(new Date(training.datetime), "HH:mm", { locale: ptBR });
        } catch { return ""; }
    })() : "";

    return (
        <div className="relative">
            <DynamicBanner
                bannerUrl={training.banner_url}
                title={training.name}
                primaryColor={training.primary_color}
                secondaryColor={training.secondary_color}
                className="w-full h-[200px] md:h-[400px] object-cover rounded-b-3xl shadow-2xl"
                fallback={<div className="flex items-center justify-center w-full h-full bg-card/50 text-muted-foreground">{training.name}</div>}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
            </DynamicBanner>

            <div className="container mx-auto px-4 mt-8 relative z-10 mb-2">
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <TrainingStatusBadge status={training.status || "AGENDADO"} />
                                <Badge variant="secondary" className="bg-primary/20 hover:bg-primary/30 text-primary border-none rounded-sm px-2 py-0.5 text-xs font-semibold">
                                    {training.mode}
                                </Badge>
                                {training.platform && (
                                    <Badge variant="secondary" className="bg-primary/20 hover:bg-primary/30 text-primary border-none rounded-sm px-2 py-0.5 text-xs font-semibold gap-1">
                                        {training.platform === "MOBILE" ? (
                                            <Smartphone className="w-3 h-3" />
                                        ) : training.platform === "PC" ? (
                                            <Monitor className="w-3 h-3" />
                                        ) : (
                                            <MonitorSmartphone className="w-3 h-3" />
                                        )}
                                        {training.platform}
                                    </Badge>
                                )}
                                <Badge variant="secondary" className="bg-primary/20 hover:bg-primary/30 text-primary border-none rounded-sm px-2 py-0.5 text-xs font-semibold gap-1.5 flex items-center">
                                    {getGameLogo(training.game) ? (
                                        <img src={getGameLogo(training.game)} alt={training.game} className="w-5 h-5 object-contain" />
                                    ) : (
                                        <Gamepad2 className="w-3 h-3" />
                                    )}
                                    {getGameLabel(training.game)}
                                </Badge>
                                <div className="ml-1 scale-90 origin-left">
                                    <ScrimPaymentBadges
                                        entryFeeCoins={training.entry_fee_coins}
                                        prizeCoins={training.prize_coins}
                                        prizeText={training.prize}
                                        primaryColor={training.primary_color}
                                        secondaryColor={training.secondary_color}
                                    />
                                </div>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground">
                                {training.name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
                                <div className="flex items-center gap-2">
                                    <OrganizerBadge
                                        verified={isVerifiedOrganizer}
                                    />
                                    {organizerProfile && (
                                        <Button
                                            variant={isFollowingOrganizer ? "secondary" : "outline"}
                                            size="sm"
                                            className="h-7 text-xs ml-2"
                                            onClick={onFollowOrganizer}
                                        >
                                            {isFollowingOrganizer ? "Seguindo" : "Seguir"}
                                        </Button>
                                    )}
                                </div>
                                <Separator orientation="vertical" className="h-4 hidden md:block" />
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="capitalize">
                                        {formattedDate}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span>
                                        {formattedTime} (Brasília)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <Button onClick={handleShare} variant="outline" className="gap-2 w-full sm:w-auto">
                                <Share2 className="w-4 h-4" />
                                Compartilhar
                            </Button>


                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Smartphone(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
            <path d="M12 18h.01" />
        </svg>
    )
}
