import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, User } from "lucide-react";
import { ProfileFormData } from "@/hooks/useProfileData";

interface ProfileDataFormProps {
    formData: ProfileFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
    mainTeam: any;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    saving: boolean;
    onCancel: () => void;
    actions: {
        bannerInputRef: React.RefObject<HTMLInputElement>;
        avatarInputRef: React.RefObject<HTMLInputElement>;
        uploadingBanner: boolean;
        uploadingAvatar: boolean;
        removingBanner: boolean;
        removingAvatar: boolean;
        handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
        handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
        handleRemoveBanner: () => Promise<void>;
        handleRemoveAvatar: () => Promise<void>;
    };
}

export function ProfileDataForm({
    formData,
    setFormData,
    mainTeam,
    onSubmit,
    saving,
    onCancel,
    actions,
}: ProfileDataFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {/* Banner Upload */}
            <div className="space-y-3">
                <Label>Banner do Perfil</Label>
                <div
                    onClick={() => actions.bannerInputRef.current?.click()}
                    className="relative h-32 md:h-40 rounded-lg border-2 border-dashed border-border bg-gradient-to-r from-primary/10 via-destructive/5 to-primary/10 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                >
                    {formData.banner_url ? (
                        <img
                            src={formData.banner_url}
                            alt="Banner"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">
                                1500 × 500 recomendado
                            </span>
                        </div>
                    )}
                    {actions.uploadingBanner && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    )}
                </div>
                <input
                    ref={actions.bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={actions.handleBannerUpload}
                    className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                    Tamanho máximo: 5MB. Formatos: JPG, PNG, GIF
                </p>

                {formData.banner_url && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="px-0 text-muted-foreground hover:text-foreground"
                        onClick={actions.handleRemoveBanner}
                        disabled={actions.removingBanner}
                    >
                        Remover banner
                    </Button>
                )}
            </div>

            {/* Avatar Upload */}
            <div className="space-y-3">
                <Label>Foto de Perfil</Label>
                <div className="flex items-center gap-4">
                    <div
                        onClick={() => actions.avatarInputRef.current?.click()}
                        className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-muted cursor-pointer hover:border-primary/50 transition-colors overflow-hidden flex items-center justify-center"
                    >
                        {formData.avatar_url ? (
                            <img
                                src={formData.avatar_url}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                        )}
                        {actions.uploadingAvatar && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => actions.avatarInputRef.current?.click()}
                        disabled={actions.uploadingAvatar}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                    </Button>

                    {formData.avatar_url && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={actions.handleRemoveAvatar}
                            disabled={actions.removingAvatar}
                        >
                            Remover foto
                        </Button>
                    )}
                </div>
                <input
                    ref={actions.avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={actions.handleAvatarUpload}
                    className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                    GIFs: máx. 2MB | Imagens: máx. 5MB
                </p>
            </div>

            <Separator />

            {/* Função + Disponibilidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="player_function">Função (posição)</Label>
                    <select
                        id="player_function"
                        value={formData.player_function || ""}
                        onChange={(e) => setFormData((p) => ({ ...p, player_function: e.target.value }))}
                        className="w-full h-10 rounded-md border border-border bg-background/50 px-3 text-sm"
                    >
                        <option value="">Não definido</option>
                        <option value="RUSH">Rush</option>
                        <option value="SUPORTE">Suporte</option>
                        <option value="CAPITÃO">Capitão</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                        Isso será usado para filtro na página Equipes (Jogadores).
                    </p>
                </div>

                {!mainTeam?.id ? (
                    <div className="rounded-lg border border-border bg-card/50 p-4 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="font-semibold">Disponível para entrar em time</p>
                            <p className="text-xs text-muted-foreground">
                                Ative se você estiver sem equipe e quiser aparecer como disponível.
                            </p>
                        </div>
                        <Switch
                            checked={!!formData.available_for_team}
                            onCheckedChange={(checked) =>
                                setFormData((p) => ({ ...p, available_for_team: !!checked }))
                            }
                        />
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-card/50 p-4">
                        <p className="font-semibold">Disponível para entrar em time</p>
                        <p className="text-xs text-muted-foreground">
                            Você já está em um time — essa opção fica desativada.
                        </p>
                    </div>
                )}
            </div>

            {/* Username */}
            <div className="space-y-2">
                <Label htmlFor="username">@username</Label>
                <Input
                    id="username"
                    placeholder="Seu_Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                    Letras, números e underscore. Mínimo 3 caracteres.
                </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
                <Label htmlFor="full_name">Nome de Exibição</Label>
                <Input
                    id="full_name"
                    placeholder="Seu nome"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="bg-background/50"
                />
            </div>
            <Separator />

            {/* Social Section */}
            <div>
                <h2 className="text-lg font-bold uppercase mb-4">Redes Sociais</h2>

                <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card/50 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Links</p>
                        <div className="mt-3 space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="discord_url">Discord (Link)</Label>
                                <Input
                                    id="discord_url"
                                    placeholder="https://discord.gg/..."
                                    value={formData.discord_url}
                                    onChange={(e) => setFormData((p) => ({ ...p, discord_url: e.target.value }))}
                                    className="bg-background/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="twitter_url">Twitter/X</Label>
                                <Input
                                    id="twitter_url"
                                    placeholder="https://x.com/seuuser"
                                    value={formData.twitter_url}
                                    onChange={(e) => setFormData((p) => ({ ...p, twitter_url: e.target.value }))}
                                    className="bg-background/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="instagram_url">Instagram</Label>
                                <Input
                                    id="instagram_url"
                                    placeholder="https://instagram.com/seuuser"
                                    value={formData.instagram_url}
                                    onChange={(e) => setFormData((p) => ({ ...p, instagram_url: e.target.value }))}
                                    className="bg-background/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="youtube_url">YouTube</Label>
                                <Input
                                    id="youtube_url"
                                    placeholder="https://youtube.com/@canal"
                                    value={formData.youtube_url}
                                    onChange={(e) => setFormData((p) => ({ ...p, youtube_url: e.target.value }))}
                                    className="bg-background/50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="discord_contact">Discord (Contato)</Label>
                        <Input
                            id="discord_contact"
                            placeholder="usuario#1234 ou usuario"
                            value={formData.discord_contact}
                            onChange={(e) =>
                                setFormData({ ...formData, discord_contact: e.target.value })
                            }
                            className="bg-background/50"
                        />
                    </div>
                </div>
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
