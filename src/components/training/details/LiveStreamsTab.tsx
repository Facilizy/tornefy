import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Plus, Trash2, ExternalLink, PlayCircle, Radio, Power, PowerOff, Tv, Loader2, MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Training } from "@/types/domain";

interface Round {
    id: string;
    name: string;
}

interface LiveStream {
    id: string;
    url: string;
    title: string;
    round_id?: string;
    is_live?: boolean;
}

interface LiveStreamsTabProps {
    training: Training;
    isOrganizer: boolean;
    primaryColor?: string;
    onUpdate: () => void;
}

export function LiveStreamsTab({ training, isOrganizer, primaryColor = "#9146FF", onUpdate }: LiveStreamsTabProps) {
    const [rounds, setRounds] = useState<Round[]>([]);
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New stream form
    const [newTitle, setNewTitle] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [newRoundId, setNewRoundId] = useState("all");

    useEffect(() => {
        fetchRounds();
        try {
            if (training.live_streams) {
                let parsed = training.live_streams;
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) {
                    setStreams((parsed as unknown) as LiveStream[]);
                }
            }
        } catch (e) {
            console.error("Failed to parse live streams", e);
        }
    }, [training.id, training.live_streams]);

    const fetchRounds = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("training_rounds")
            .select("id, name, round_number")
            .eq("training_id", training.id)
            .order("round_number");

        if (!error && data) {
            setRounds(data);
        }
        setLoading(false);
    };

    const handleAddStream = async () => {
        if (!newTitle.trim() || !newUrl.trim()) {
            toast.error("Preencha o título e a URL da transmissão.");
            return;
        }
        if (!/^https?:\/\//i.test(newUrl)) {
            toast.error("Insira uma URL válida começando com http:// ou https://");
            return;
        }

        const newStream: LiveStream = {
            id: crypto.randomUUID(),
            title: newTitle.trim(),
            url: newUrl.trim(),
            round_id: newRoundId !== "all" ? newRoundId : undefined,
            is_live: true,
        };

        const updatedStreams = [...streams, newStream];
        await saveStreams(updatedStreams);

        setNewTitle("");
        setNewUrl("");
        setNewRoundId("all");
    };

    const handleDeleteStream = async (id: string) => {
        const updatedStreams = streams.filter(s => s.id !== id);
        await saveStreams(updatedStreams);
    };

    const handleToggleLive = async (id: string, isLive: boolean) => {
        const updatedStreams = streams.map(s =>
            s.id === id ? { ...s, is_live: isLive } : s
        );
        await saveStreams(updatedStreams);
    };

    const saveStreams = async (updatedStreams: LiveStream[]) => {
        setSaving(true);
        const { error } = await supabase
            .from("trainings")
            .update({ live_streams: updatedStreams as any })
            .eq("id", training.id);

        setSaving(false);
        if (error) {
            toast.error(`Erro ao salvar transmissão: ${error.message || error.details || "Erro desconhecido"}`);
        } else {
            toast.success("Transmissões atualizadas!");
            setStreams(updatedStreams);
            onUpdate();
        }
    };

    const getEmbedUrl = (url: string) => {
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
                let videoId = "";
                if (parsed.hostname.includes("youtu.be")) {
                    videoId = parsed.pathname.slice(1);
                } else {
                    videoId = parsed.searchParams.get("v") || "";
                }
                return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
            }
            if (parsed.hostname.includes("twitch.tv")) {
                const channel = parsed.pathname.slice(1);
                return channel ? `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}` : null;
            }
        } catch {
            return null;
        }
        return null;
    };

    const getPlatformInfo = (url: string) => {
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
                return { name: "YouTube", color: "#FF0000" };
            }
            if (parsed.hostname.includes("twitch.tv")) {
                return { name: "Twitch", color: "#9146FF" };
            }
        } catch { }
        return { name: "Live", color: "#666" };
    };

    const getRoundName = (roundId?: string) => {
        if (!roundId) return "Geral";
        const r = rounds.find(r => r.id === roundId);
        return r ? r.name : "Rodada Desconhecida";
    };

    const sortedStreams = [...streams].sort((a, b) => {
        if (a.is_live === b.is_live) return 0;
        return a.is_live ? -1 : 1;
    });

    const YouTubeLogo = () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );

    const TwitchLogo = () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M2.348 0L0 2.348v16.036h4.696v3.262l3.262-3.262H11.087l6.522-6.522V0H2.348zm13.739 10.435l-3.261 3.261H9.13l-2.609 2.609v-2.609H3.913V1.304h12.174v9.131zm-2.609-6.522h-1.304v4.565h1.304V3.913zm-3.913 0H8.261v4.565h1.304V3.913z" />
        </svg>
    );

    function renderStreamCard(stream: LiveStream, isOffline = false) {
        const embedUrl = getEmbedUrl(stream.url);
        const platform = getPlatformInfo(stream.url);

        return (
            <Card key={stream.id} className={`group overflow-hidden transition-all duration-500 rounded-[2.5rem] border-2 flex flex-col ${isOffline
                ? 'bg-[#0f0f0f] border-white/5 opacity-100'
                : 'bg-[#0f0f0f] border-white/10 shadow-2xl'
                }`}>
                <div className="p-7 flex flex-col gap-5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-5 min-w-0">
                            {/* Platform Icon Box (Red/Purple) */}
                            <div
                                className="p-3.5 rounded-2xl bg-black border border-white/10 shadow-xl shrink-0 transition-transform group-hover:scale-105"
                                style={{ color: platform.color }}
                            >
                                {platform.name === "YouTube" ? <YouTubeLogo /> : platform.name === "Twitch" ? <TwitchLogo /> : <Tv className="w-6 h-6" />}
                            </div>

                            <div className="min-w-0 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-white/10 text-white border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg">
                                        {platform.name}
                                    </Badge>
                                    <Badge className="bg-primary/20 text-primary border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg">
                                        {getRoundName(stream.round_id)}
                                    </Badge>
                                </div>
                                <h3 className="font-black text-lg md:text-xl leading-tight tracking-tight text-white uppercase italic truncate pr-4">
                                    {platform.name === "YouTube" ? "🏆 " : ""}{stream.title}
                                </h3>
                            </div>
                        </div>

                        {isOrganizer && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10">
                                    <Label className={`text-[9px] font-black tracking-widest ${stream.is_live ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {stream.is_live ? "AO VIVO" : "OFFLINE"}
                                    </Label>
                                    <Switch
                                        checked={!!stream.is_live}
                                        onCheckedChange={(checked) => handleToggleLive(stream.id, checked)}
                                        disabled={saving}
                                        className="data-[state=checked]:bg-destructive"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStream(stream.id)}
                                    className="rounded-2xl h-9 w-9 text-white/40 hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Canal Button - REDUCED SIZE AS REQUESTED */}
                    <div className="flex">
                        <Button
                            variant="outline"
                            asChild
                            className="bg-[#1a1a1a] hover:bg-[#252525] border-white/10 rounded-2xl h-10 w-[130px] font-black uppercase tracking-[0.15em] text-[10px] text-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5"
                        >
                            <a href={stream.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3.5 h-3.5 text-white" />
                                Canal
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Player Area - ALLOW WATCHING EVEN IF OFFLINE */}
                <div className={`relative w-full aspect-video bg-black overflow-hidden group/player ${isOffline ? 'opacity-80' : ''}`}>
                    {embedUrl ? (
                        <iframe
                            src={embedUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900">
                            <Video className="w-12 h-12 text-white/5 mb-3" />
                            <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Player Externo</p>
                        </div>
                    )}

                    {isOffline && (
                        <div className="absolute top-4 left-4 z-10 pointer-events-none transition-opacity group-hover/player:opacity-0">
                            <div className="bg-black/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3 shadow-2xl scale-90 origin-top-left">
                                <div className="bg-neutral-800 border border-white/5 rounded-lg px-2 py-0.5 text-[8px] font-bold text-white/60">OFF</div>
                                <span className="text-xs font-black text-white tracking-tight">TRANSMISSÃO ENCERRADA</span>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card className="p-6 bg-card/80 border-border">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            {isOrganizer && (
                <Card className="p-6 bg-card/40 backdrop-blur-md border-border/50 rounded-3xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 pointer-events-none" />
                    <h3 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight" style={{ color: primaryColor }}>
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Plus className="w-5 h-5" />
                        </div>
                        Adicionar Transmissão
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título da Live</Label>
                            <Input
                                placeholder="Ex: Oficial Grupo A"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="rounded-2xl h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">URL (Twitch ou YouTube)</Label>
                            <Input
                                placeholder="https://twitch.tv/..."
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                className="rounded-2xl h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rodada Associada</Label>
                            <Select value={newRoundId} onValueChange={setNewRoundId}>
                                <SelectTrigger className="rounded-2xl h-12 bg-background/50 border-border/50">
                                    <SelectValue placeholder="Selecione a rodada" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/50">
                                    <SelectItem value="all">Todas as Rodadas / Geral</SelectItem>
                                    {rounds.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button
                        onClick={handleAddStream}
                        disabled={saving}
                        className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Salvar Transmissão
                    </Button>
                </Card>
            )}

            {streams.length === 0 ? (
                <Card className="p-16 bg-card/40 backdrop-blur-sm border-border/40 rounded-3xl flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-muted/20 rounded-3xl flex items-center justify-center mb-6">
                        <Video className="w-10 h-10 text-muted-foreground opacity-40" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Nenhuma transmissão</h3>
                    <p className="text-muted-foreground max-w-sm text-sm">
                        As lives cadastradas aparecem aqui para os jogadores assistirem diretamente na Tornefy.
                    </p>
                </Card>
            ) : (
                <div className="space-y-16">
                    {sortedStreams.filter(s => s.is_live).length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 rounded-full border border-destructive/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                                    </span>
                                    <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Ao Vivo Agora</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-10">
                                {sortedStreams.filter(s => s.is_live).map(stream => renderStreamCard(stream))}
                            </div>
                        </div>
                    )}

                    {sortedStreams.filter(s => !s.is_live).length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-3 border-t border-border/40 pt-10">
                                <div className="flex items-center gap-2 px-3 py-1 bg-muted/40 rounded-full border border-border/60">
                                    <Radio className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Streams Offline</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                                {sortedStreams.filter(s => !s.is_live).map(stream => renderStreamCard(stream, true))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
