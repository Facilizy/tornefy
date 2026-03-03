import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, ScrollText, HelpCircle, Trophy, Lock, Unlock, Users, Coins } from "lucide-react";
import { Training, TrainingAccess, OrganizerProfile } from "@/types/domain";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";
import { useNavigate } from "react-router-dom";
import { EventInfoSection } from "@/components/EventInfoSection";

interface TrainingRegistrationCardProps {
    training: Training;
    organizerProfile?: OrganizerProfile | null;
    isRegistered: boolean;
    trainingAccess: TrainingAccess | null;
    registeredTeamsCount: number;
    onRegister: () => void;
    onManage: () => void;
    isFull: boolean;
    sessionExpired: boolean;
}

export function TrainingRegistrationCard({
    training,
    organizerProfile,
    isRegistered,
    trainingAccess,
    registeredTeamsCount,
    onRegister,
    onManage,
    isFull,
}: TrainingRegistrationCardProps) {
    const navigate = useNavigate();
    const entryFee = Number(training.entry_fee_coins || 0);
    const isPaid = entryFee > 0;
    const isClosed = ["INSCRIÇÕES ENCERRADAS", "EM ANDAMENTO", "FINALIZADO"].includes(
        training.status || ""
    );

    return (
        <div className="space-y-6 sticky top-24">
            {/* Card 1: Inscrição e Vagas */}
            <Card className="p-6 space-y-6 border-border/50 bg-card/40 backdrop-blur-sm rounded-xl">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Inscrição</h3>
                        {isPaid ? (
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
                                <Coins className="w-3 h-3 mr-1" />
                                {entryFee} TC
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-green-500 border-green-500/20">
                                Gratuito
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Vagas preenchidas</span>
                            <span className="font-medium font-mono text-[13px]">
                                {registeredTeamsCount} / {training.max_slots}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{
                                    backgroundColor: training.primary_color || "hsl(var(--primary))",
                                    width: `${Math.min(
                                        ((registeredTeamsCount || 0) / (training.max_slots || 1)) * 100,
                                        100
                                    )}%`,
                                }}
                            />
                        </div>
                        {isFull && <p className="text-xs text-muted-foreground mt-1">Treino lotado</p>}
                    </div>

                    {isRegistered ? (
                        <div className="pt-2">
                            <Button onClick={onManage} className="w-full text-white" style={{ backgroundColor: training.primary_color || "hsl(var(--primary))" }} variant="default">
                                Gerenciar Inscrição
                            </Button>
                        </div>
                    ) : (
                        <div className="pt-2">
                            <Button
                                onClick={onRegister}
                                className="w-full font-bold text-white"
                                size="lg"
                                style={{ backgroundColor: training.primary_color || "hsl(var(--primary))" }}
                                disabled={isClosed || (isFull && !isRegistered)}
                            >
                                {isClosed ? (
                                    <>
                                        <Lock className="w-4 h-4 mr-2" /> Inscrições Encerradas
                                    </>
                                ) : isFull ? (
                                    <>
                                        <Users className="w-4 h-4 mr-2" /> Lotado
                                    </>
                                ) : (
                                    <>
                                        <Unlock className="w-4 h-4 mr-2" /> Inscrever-se
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {trainingAccess?.mode === "members_only" && !trainingAccess.eligible && (
                        <div className="text-xs text-center text-red-500 bg-red-500/10 p-2 rounded-md">
                            Exclusivo para assinantes de planos específicos.
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-border/50 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        Premiação
                    </h4>
                    {(training as any).prizes_description ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                            {(training as any).prizes_description}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            Nenhuma premiação informada.
                        </p>
                    )}
                </div>
            </Card>

            {/* Card 2: Ações de Apoio (Regras, Pontuação, Ajuda) */}
            <EventInfoSection
                rules={training.rules || undefined}
                pointsPerKill={training.points_per_kill || 0}
                pointsPerPosition={training.points_per_position as any}
                pointsPerPositionText={(training as any).points_per_position_text || undefined}
                discordLink={training.discord_link || undefined}
                whatsappLink={training.whatsapp_link || undefined}
                primaryColor={training.primary_color || undefined}
            />

            {/* Card 3: Organizador */}
            {organizerProfile && (
                <Card className="p-6 border-border/50 bg-card/40 backdrop-blur-sm rounded-xl space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Organizador
                    </h3>
                    <div className="flex items-center gap-4">
                        {organizerProfile.avatar_url ? (
                            <img
                                src={organizerProfile.avatar_url}
                                alt="Organizador"
                                className="w-12 h-12 rounded-lg object-cover bg-muted"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                <DefaultAvatarMark className="h-6 w-6 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate flex items-center gap-1">
                                {organizerProfile.username}
                                {(organizerProfile as any).verified && (
                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold ml-1">
                                        V
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {(organizerProfile as any).followers_count || 0} seguidores
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate(`/profile/${(organizerProfile as any).slug || organizerProfile.id}`)}
                        variant="ghost"
                        className="w-full text-xs font-semibold hover:bg-muted/50"
                    >
                        Ver perfil completo
                    </Button>
                </Card>
            )}
        </div>
    );
}
