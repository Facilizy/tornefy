import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PushNotificationsOptInCard } from "@/components/PushNotificationsOptInCard";
import { ArrowLeft, Upload, User, Loader2, Gamepad2, Link2 } from "lucide-react";
import { toast } from "sonner";

const GAMES = [
  { id: "free_fire", name: "Free Fire", logo: "/game-logos/free-fire.png" },
  { id: "blood_strike", name: "Blood Strike", logo: "/game-logos/blood-strike.png" },
  { id: "farlight_84", name: "Farlight 84", logo: "/game-logos/farlight-84.png" },
  { id: "prime_rush", name: "Prime Rush", logo: "/game-logos/prime-rush.png" },
  { id: "battlefield_6", name: "Battlefield 6", logo: "/game-logos/battlefield-6.png" },
];

const ProfileEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    discord_contact: "",
    tracker_url: "",
    avatar_url: "",
    banner_url: "",
    preferred_games: [] as string[],
  });

  useEffect(() => {
    checkUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event) => {
      // If we returned from an OAuth redirect (linkIdentity), refresh providers.
      refreshLinkedProviders();
      setLinkingDiscord(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the page received OAuth params, clean the URL after hydration.
  useEffect(() => {
    const hasOAuthParams =
      location.search.includes("code=") ||
      location.search.includes("error=") ||
      location.hash.includes("access_token=") ||
      location.hash.includes("error=");

    if (hasOAuthParams) {
      // Replace URL to avoid re-processing on refresh
      navigate("/profile/edit", { replace: true });
    }
  }, [location.search, location.hash, navigate]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    const identities = (session.user.identities || []) as any[];
    setLinkedProviders(identities.map((i) => i.provider).filter(Boolean));
    await fetchProfile(session.user.id);
  };

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error) throw error;
      
      const preferredGames = Array.isArray(data.preferred_games)
        ? data.preferred_games.filter((g: any): g is string => typeof g === "string")
        : ["free_fire"];
      
      setFormData({
        full_name: data.full_name || "",
        username: data.username || "",
        discord_contact: data.discord_contact || "",
        tracker_url: data.tracker_url || "",
        avatar_url: data.avatar_url || "",
        banner_url: data.banner_url || "",
        preferred_games: preferredGames,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou GIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-profiles")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(fileName);

      setFormData({ ...formData, banner_url: `${publicUrl}?t=${Date.now()}` });
      toast.success("Banner atualizado!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload do banner");
      console.error(error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou GIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-profiles")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(fileName);

      setFormData({ ...formData, avatar_url: `${publicUrl}?t=${Date.now()}` });
      toast.success("Foto atualizada!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload da foto");
      console.error(error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username || null,
          discord_contact: formData.discord_contact || null,
          tracker_url: formData.tracker_url || null,
          avatar_url: formData.avatar_url || null,
          banner_url: formData.banner_url || null,
          preferred_games: formData.preferred_games.length > 0 ? formData.preferred_games : ["free_fire"],
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      navigate("/profile");
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Este username já está em uso");
      } else {
        toast.error("Erro ao salvar perfil");
      }
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const setPreferredGames = (games: string[]) => {
    setFormData((prev) => ({ ...prev, preferred_games: games }));
  };

  const refreshLinkedProviders = async () => {
    const { data } = await supabase.auth.getUser();
    const identities = (data.user?.identities || []) as any[];
    setLinkedProviders(identities.map((i) => i.provider).filter(Boolean));
  };

  const handleLinkDiscord = async () => {
    try {
      setLinkingDiscord(true);
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/profile/edit`,
        },
      });
      if (error) throw error;

      // Some Supabase setups return a URL that needs manual navigation.
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (e: any) {
      const msg = e?.message || "Erro ao conectar Discord";
      if (String(e?.code) === "manual_linking_disabled" || msg.toLowerCase().includes("manual linking")) {
        toast.error(
          "O Supabase está com 'Manual linking' desativado para Discord. Ative em Authentication → Providers → Discord."
        );
      } else {
        toast.error(msg);
      }
      setLinkingDiscord(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Perfil
        </Button>

        <Card className="p-6 md:p-8 bg-card border-border">
          <h1 className="text-2xl font-black uppercase mb-8">Editar Perfil</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Banner Upload */}
            <div className="space-y-3">
              <Label>Banner do Perfil</Label>
              <div
                onClick={() => bannerInputRef.current?.click()}
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
                {uploadingBanner && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleBannerUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Tamanho máximo: 5MB. Formatos: JPG, PNG, GIF
              </p>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-3">
              <Label>Foto de Perfil</Label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => avatarInputRef.current?.click()}
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
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                GIFs: máx. 2MB | Imagens: máx. 5MB
              </p>
            </div>

            <Separator />

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">@username</Label>
              <Input
                id="username"
                placeholder="Seu_Username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
                className="bg-background/50"
              />
            </div>

            <Separator />

            {/* Jogos Preferidos */}

            {/* Social Section */}
            <div>
              <h2 className="text-lg font-bold uppercase mb-4">Redes Sociais</h2>

              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold">Contas conectadas</p>
                      <p className="text-xs text-muted-foreground">
                        Conecte provedores para entrar sem senha e manter a mesma conta.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={handleLinkDiscord}
                      disabled={linkingDiscord || linkedProviders.includes("discord")}
                    >
                      {linkingDiscord ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DiscordMark className="w-4 h-4 mr-2" />
                      )}
                      {linkedProviders.includes("discord") ? "Discord conectado" : "Conectar Discord"}
                    </Button>
                  </div>

                  {linkedProviders.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {linkedProviders.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1 text-xs"
                        >
                          <Link2 className="w-3.5 h-3.5 text-primary" />
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
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

                <PushNotificationsOptInCard userId={user?.id} />
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
                {GAMES.map((game) => (
                  <ToggleGroupItem
                    key={game.id}
                    value={game.id}
                    aria-label={game.name}
                    className="w-full justify-start gap-3 px-3 py-3 h-auto rounded-lg border border-border bg-background/30 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    <img
                      src={game.logo}
                      alt={game.name}
                      loading="lazy"
                      className="w-8 h-8 rounded object-cover"
                    />
                    <span className="flex-1 font-medium text-left">{game.name}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <Separator />

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/profile")}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-primary hover:bg-primary/90"
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
        </Card>
      </div>
    </MainLayout>
  );
};

const DiscordMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export default ProfileEdit;
