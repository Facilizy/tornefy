import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Swords, Users, Trophy, MessageCircle, Settings, Video } from "lucide-react";
import { Training } from "@/types/domain";

interface TrainingTabsProps {
    training: Training;
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (val: string) => void;
    showChat: boolean;
    isOrganizer?: boolean;
}

export function TrainingTabs({
    training,
    children,
    activeTab,
    onTabChange,
    showChat,
    isOrganizer = false,
}: TrainingTabsProps) {
    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full space-y-6">
            <TabsList className="w-full justify-start h-auto p-1 bg-card/40 backdrop-blur-sm border border-border/40 rounded-xl overflow-x-auto">
                <TabsTrigger
                    value="overview"
                    className="gap-2 px-6 py-2.5 rounded-lg border border-transparent transition-all
                               data-[state=active]:text-black 
                               hover:bg-muted/50 data-[state=active]:hover:bg-transparent"
                    style={{
                        backgroundColor: activeTab === "overview" ? training.primary_color || "hsl(var(--primary))" : undefined,
                        borderColor: activeTab === "overview" ? training.primary_color || "hsl(var(--primary))" : undefined
                    }}
                >
                    <Info className="w-4 h-4" />
                    Visão Geral
                </TabsTrigger>

                <TabsTrigger
                    value="matches"
                    className="gap-2 px-6 py-2.5 rounded-lg border border-transparent transition-all
                               data-[state=active]:text-black
                               hover:bg-muted/50 data-[state=active]:hover:bg-transparent"
                    style={{
                        backgroundColor: activeTab === "matches" ? training.primary_color || "hsl(var(--primary))" : undefined,
                        borderColor: activeTab === "matches" ? training.primary_color || "hsl(var(--primary))" : undefined
                    }}
                >
                    <Swords className="w-4 h-4" />
                    Partidas
                </TabsTrigger>

                <TabsTrigger
                    value="teams"
                    className="gap-2 px-6 py-2.5 rounded-lg border border-transparent transition-all
                               data-[state=active]:text-black
                               hover:bg-muted/50 data-[state=active]:hover:bg-transparent"
                    style={{
                        backgroundColor: activeTab === "teams" ? training.primary_color || "hsl(var(--primary))" : undefined,
                        borderColor: activeTab === "teams" ? training.primary_color || "hsl(var(--primary))" : undefined
                    }}
                >
                    <Users className="w-4 h-4" />
                    Equipes
                </TabsTrigger>

                <TabsTrigger
                    value="ranking"
                    className="gap-2 px-6 py-2.5 rounded-lg border border-transparent transition-all
                               data-[state=active]:text-black
                               hover:bg-muted/50 data-[state=active]:hover:bg-transparent"
                    style={{
                        backgroundColor: activeTab === "ranking" ? training.primary_color || "hsl(var(--primary))" : undefined,
                        borderColor: activeTab === "ranking" ? training.primary_color || "hsl(var(--primary))" : undefined
                    }}
                >
                    <Trophy className="w-4 h-4" />
                    Ranking
                </TabsTrigger>

                <TabsTrigger
                    value="lives"
                    className="gap-2 px-6 py-2.5 rounded-lg border border-transparent transition-all
                               data-[state=active]:text-black
                               hover:bg-muted/50 data-[state=active]:hover:bg-transparent"
                    style={{
                        backgroundColor: activeTab === "lives" ? training.primary_color || "hsl(var(--primary))" : undefined,
                        borderColor: activeTab === "lives" ? training.primary_color || "hsl(var(--primary))" : undefined
                    }}
                >
                    <Video className="w-4 h-4" />
                    Transmissões
                </TabsTrigger>

                {showChat && (
                    <TabsTrigger
                        value="chat"
                        className="gap-2 px-6 py-2.5 rounded-lg border border-transparent transition-all
                                   data-[state=active]:text-black
                                   hover:bg-muted/50 data-[state=active]:hover:bg-transparent"
                        style={{
                            backgroundColor: activeTab === "chat" ? training.primary_color || "hsl(var(--primary))" : undefined,
                            borderColor: activeTab === "chat" ? training.primary_color || "hsl(var(--primary))" : undefined
                        }}
                    >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                    </TabsTrigger>
                )}

                {isOrganizer && (
                    <TabsTrigger
                        value="settings"
                        className="gap-2 px-6 py-2.5 rounded-lg border border-transparent transition-all
                                   data-[state=active]:text-black hidden md:flex ml-auto
                                   hover:bg-muted/50 data-[state=active]:hover:bg-transparent"
                        style={{
                            backgroundColor: activeTab === "settings" ? training.primary_color || "hsl(var(--primary))" : undefined,
                            borderColor: activeTab === "settings" ? training.primary_color || "hsl(var(--primary))" : undefined
                        }}
                    >
                        <Settings className="w-4 h-4" />
                        Configurações
                    </TabsTrigger>
                )}
            </TabsList>

            {children}
        </Tabs>
    );
}
