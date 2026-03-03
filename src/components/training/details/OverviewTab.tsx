import { Card } from "@/components/ui/card";
import { Training } from "@/types/domain";
import { EventInfoSection } from "@/components/EventInfoSection";
import { TrainingQnaSection } from "@/components/training/TrainingQnaSection";
import { MinimumTeamsProgress } from "@/components/training/MinimumTeamsProgress";
import { MvpListCard } from "@/components/training/MvpListCard";
import { TrainingRegistrationCard } from "@/components/training/details/TrainingRegistrationCard";
import { OrganizerProfile } from "@/types/domain";

interface OverviewTabProps {
    training: Training;
    organizerProfile: OrganizerProfile | null;
    currentUser?: any;
    userRole?: string;
    registeredTeamsCount: number;
    isRegistered: boolean;
    trainingAccess: any;
    onRegister: () => void;
    onManage: () => void;
    isFull: boolean;
}

export function OverviewTab({
    training,
    organizerProfile,
    currentUser,
    userRole,
    registeredTeamsCount,
    isRegistered,
    trainingAccess,
    onRegister,
    onManage,
    isFull
}: OverviewTabProps) {
    // Logic to calculate progress, etc.
    const minTeams = (training as any).min_teams || 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EventInfoSection
                        rules={training.rules || undefined}
                        pointsPerKill={training.points_per_kill || 0}
                        pointsPerPosition={training.points_per_position as any}
                        pointsPerPositionText={(training as any).points_per_position_text || undefined}
                        discordLink={training.discord_link || undefined}
                        whatsappLink={training.whatsapp_link || undefined}
                        primaryColor={training.primary_color || undefined}
                        entryFeeCoins={training.entry_fee_coins}
                        prizeCoins={training.prize_coins}
                        prizeText={training.prize}
                    />

                    <div className="space-y-6">
                        {minTeams > 0 && (
                            <MinimumTeamsProgress
                                confirmedTeams={registeredTeamsCount}
                                maxTeams={training.max_slots || 0}
                                primaryColor={training.primary_color || "hsl(var(--primary))"}
                            />
                        )}

                        {/* As Regras agora estão acessíveis pelo menu lateral rápido no TrainingRegistrationCard */}
                        {/* 
                        <Card className="p-6">
                            <h3 className="font-bold mb-4">Regras</h3>
                            <div className="prose dark:prose-invert max-w-none text-sm text-muted-foreground">
                                {training.rules ? (
                                    <div dangerouslySetInnerHTML={{ __html: training.rules.replace(/\n/g, "<br/>") }} />
                                ) : (
                                    "Sem regras definidas."
                                )}
                            </div>
                        </Card> 
                        */}
                    </div>
                </div>

                <TrainingQnaSection
                    trainingId={training.id}
                    userId={currentUser?.id}
                    canAnswer={userRole === "admin" || userRole === "organizer"}
                    canModerate={userRole === "admin" || userRole === "organizer"}
                    primaryColor={training.primary_color}
                />

                {/* Nota: MvpListCard desativado aqui pois requer array completa de times, e para performance deixaremos isso apenas na tab Ranking */}
            </div>

            <div className="space-y-6">
                <TrainingRegistrationCard
                    training={training}
                    organizerProfile={organizerProfile}
                    isRegistered={isRegistered}
                    trainingAccess={trainingAccess}
                    registeredTeamsCount={registeredTeamsCount}
                    onRegister={onRegister}
                    onManage={onManage}
                    isFull={isFull}
                    sessionExpired={false}
                />
            </div>
        </div>
    );
}
