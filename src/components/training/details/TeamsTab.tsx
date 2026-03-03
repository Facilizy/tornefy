import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrainingRegistrationWithTeam, ScrimGroup, ScrimGroupTeam } from "@/types/domain";
import { TrainingTeamsPreviewSkeleton } from "@/components/skeletons/TrainingTeamsPreviewSkeleton";
import { TeamVerifiedBadge } from "@/components/TeamVerifiedBadge";

interface TeamsTabProps {
    loading: boolean;
    registeredTeams: TrainingRegistrationWithTeam[];
    scrimGroups: ScrimGroup[];
    scrimGroupTeams: ScrimGroupTeam[];
    useGroups: boolean;
    maxSlots: number;
    invitedTags?: string[] | null;
}

export function TeamsTab({
    loading,
    registeredTeams,
    scrimGroups,
    scrimGroupTeams,
    useGroups,
    maxSlots,
    invitedTags,
}: TeamsTabProps) {
    if (loading) {
        return <TrainingTeamsPreviewSkeleton />;
    }

    // Filter by invited tags if they exist
    let filteredRegisteredTeams = registeredTeams;
    if (invitedTags && invitedTags.length > 0) {
        filteredRegisteredTeams = registeredTeams.filter(reg =>
            reg.teams?.tag && invitedTags.includes(reg.teams.tag.toUpperCase())
        );
    }

    // Sort by slot number, handling nulls
    const confirmedTeams = [...filteredRegisteredTeams].sort((a, b) =>
        (Number(a.slot_number) || 999) - (Number(b.slot_number) || 999)
    );

    const emptySlotsCount = Math.max(0, maxSlots - confirmedTeams.length);

    // Grouped View (if enabled and groups exist)
    if (useGroups && scrimGroups.length > 0) {
        return (
            <div className="space-y-6">
                {scrimGroups.map((group) => {
                    const groupTeamIds = new Set(
                        scrimGroupTeams
                            .filter((gt) => gt.group_id === group.id)
                            .map((gt) => gt.team_id)
                    );

                    const teamsInGroup = confirmedTeams.filter((reg) =>
                        groupTeamIds.has(reg.team_id)
                    );

                    return (
                        <Card key={group.id} className="p-6">
                            <h3 className="text-lg font-bold mb-4 border-l-4 border-primary pl-3">
                                {group.name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teamsInGroup.map((reg) => (
                                    <TeamCard key={reg.id} reg={reg} />
                                ))}
                                {teamsInGroup.length === 0 && (
                                    <p className="text-muted-foreground text-sm italic col-span-full">
                                        Nenhuma equipe neste grupo.
                                    </p>
                                )}
                            </div>
                        </Card>
                    );
                })}

                {/* Teams not in any group? */}
                {confirmedTeams.some(reg => !scrimGroupTeams.some(gt => gt.team_id === reg.team_id)) && (
                    <div className="mt-8 border-t pt-4">
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Outras Equipes / Sem Grupo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {confirmedTeams
                                .filter(reg => !scrimGroupTeams.some(gt => gt.team_id === reg.team_id))
                                .map(reg => <TeamCard key={reg.id} reg={reg} />)
                            }
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Standard Grid View
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {confirmedTeams.map((reg) => (
                <TeamCard key={reg.id} reg={reg} />
            ))}

            {Array.from({ length: emptySlotsCount }).map((_, i) => (
                <div
                    key={`empty-${i}`}
                    className="p-4 flex items-center gap-4 border border-dashed border-border/60 bg-transparent opacity-50 rounded-lg h-20"
                >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {confirmedTeams.length + i + 1}
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">Disponível</div>
                </div>
            ))}
        </div>
    );
}

function TeamCard({ reg }: { reg: TrainingRegistrationWithTeam }) {
    const team = reg.teams;
    if (!team) return null;

    return (
        <div className="p-4 rounded-lg border bg-card flex items-center gap-4 hover:bg-muted/50 transition-colors">
            <div className="relative shrink-0">
                <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={team.logo_url || ""} />
                    <AvatarFallback>{team.tag?.substring(0, 2) || "??"}</AvatarFallback>
                </Avatar>
                {reg.slot_number && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full border border-border flex items-center justify-center w-5 h-5 shadow-sm">
                        <span className="text-[10px] font-bold">{reg.slot_number}</span>
                    </div>
                )}
            </div>
            <div className="overflow-hidden">
                <div className="flex items-center gap-1.5 w-full">
                    <span className="font-bold text-sm truncate">{team.name}</span>
                    <TeamVerifiedBadge verified={!!(team as any).is_verified} className="w-3.5 h-3.5 text-primary shrink-0" />
                    {team.is_external && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-muted/50 text-muted-foreground border-border/50">
                            Convidada
                        </Badge>
                    )}
                </div>
                <div className="text-xs text-muted-foreground font-mono">{team.tag}</div>
            </div>
        </div>
    );
}

