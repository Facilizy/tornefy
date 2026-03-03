import { Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    PlayerTradingCard,
    type PlayerCardFrame,
    type PlayerTradingCardData,
} from "@/components/players/PlayerTradingCard";
import { ProfileFormData } from "@/hooks/useProfileData";
import { Gamepad2 } from "lucide-react";
import { GAMES as GAME_META, getGameLabel } from "@/lib/games";

const GAME_OPTIONS = GAME_META.map((g) => ({ id: g.id, name: g.label, logo: g.logo }));

interface ProfilePersonalizationProps {
    formData: ProfileFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
    user: any;
    frames: PlayerCardFrame[];
    loadingFrames: boolean;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    saving: boolean;
    onCancel: () => void;
    Button: any; // Passing Button to avoid circular deps if needed, but standard import is fine
    Loader2: any;
}

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function ProfilePersonalization({
    formData,
    setFormData,
    user,
    frames,
    loadingFrames,
    onSubmit,
    saving,
    onCancel,
}: Omit<ProfilePersonalizationProps, 'Button' | 'Loader2'>) {

    const setPreferredGames = (games: string[]) => {
        setFormData((prev) => ({ ...prev, preferred_games: games }));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {/* Molduras */}
            <div>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="text-lg font-bold uppercase mb-1 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Molduras
                        </h2>
                        <p className="text-sm text-muted-foreground">Escolha uma moldura para o seu Card de Jogador.</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {loadingFrames ? "Carregando…" : `${frames.length} disponíveis`}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                    <div className="rounded-xl border border-border bg-background/20 p-4">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            <button
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, player_card_frame_id: "" }))}
                                className={
                                    "rounded-xl border px-3 py-3 text-left transition-colors " +
                                    (!formData.player_card_frame_id
                                        ? "border-primary bg-primary/10"
                                        : "border-border bg-background/30 hover:bg-accent/20")
                                }
                            >
                                <p className="text-xs font-semibold">Sem moldura</p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">Padrão</p>
                            </button>

                            {frames.map((f) => {
                                const active = formData.player_card_frame_id === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setFormData((p) => ({ ...p, player_card_frame_id: f.id }))}
                                        className={
                                            "rounded-xl border px-3 py-3 text-left transition-colors " +
                                            (active
                                                ? "border-primary bg-primary/10"
                                                : "border-border bg-background/30 hover:bg-accent/20")
                                        }
                                    >
                                        <p className="text-xs font-semibold truncate">{f.name}</p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                            {String(f.rarity).toUpperCase()}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/20 p-4">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Preview</p>
                        <div className="mt-3 flex justify-center">
                            <PlayerTradingCard
                                player={
                                    {
                                        id: user?.id || "me",
                                        username: formData.username || null,
                                        full_name: formData.full_name || null,
                                        avatar_url: formData.avatar_url || null,
                                        function: "Jogador",
                                        team: null,
                                        rank: null,
                                    } satisfies PlayerTradingCardData
                                }
                                frame={
                                    formData.player_card_frame_id
                                        ? frames.find((x) => x.id === formData.player_card_frame_id) || null
                                        : null
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Jogos Preferidos */}
            <div>
                <h2 className="text-lg font-bold uppercase mb-4 flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    Jogos Preferidos
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Selecione os jogos que você joga para receber recomendações de scrims personalizadas.
                </p>

                <ToggleGroup
                    type="multiple"
                    value={formData.preferred_games}
                    onValueChange={(value) => setPreferredGames(value)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                    {GAME_OPTIONS.map((game) => (
                        <ToggleGroupItem
                            key={game.id}
                            value={game.id}
                            aria-label={game.name}
                            className="w-full justify-start gap-3 px-3 py-3 h-auto rounded-lg border border-border bg-background/30 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                            {game.logo ? (
                                <img
                                    src={game.logo}
                                    alt={game.name}
                                    loading="lazy"
                                    className="w-8 h-8 rounded object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded bg-background/40 grid place-items-center text-[10px] font-semibold text-muted-foreground">
                                    {getGameLabel(game.id)}
                                </div>
                            )}
                            <span className="flex-1 font-medium text-left">{game.name}</span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        "Salvar Alterações"
                    )}
                </Button>
            </div>
        </form>
    );
}
