import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, User, Loader2, Gamepad2 } from "lucide-react";
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
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
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
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
      
      setFormData({
        full_name: data.full_name || "",
        username: data.username || "",
        discord_contact: data.discord_contact || "",
        tracker_url: data.tracker_url || "",
        avatar_url: data.avatar_url || "",
        banner_url: data.banner_url || "",
        preferred_games: data.preferred_games || ["free_fire"],
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GAMES.map((game) => (
                  <div
                    key={game.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.preferred_games.includes(game.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setFormData((prev) => {
                        const isSelected = prev.preferred_games.includes(game.id);
                        return {
                          ...prev,
                          preferred_games: isSelected
                            ? prev.preferred_games.filter((g) => g !== game.id)
                            : [...prev.preferred_games, game.id],
                        };
                      });
                    }}
                  >
                    <Checkbox
                      checked={formData.preferred_games.includes(game.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => {
                        setFormData((prev) => {
                          const isSelected = prev.preferred_games.includes(game.id);
                          return {
                            ...prev,
                            preferred_games: isSelected
                              ? prev.preferred_games.filter((g) => g !== game.id)
                              : [...prev.preferred_games, game.id],
                          };
                        });
                      }}
                    />
                    <img
                      src={game.logo}
                      alt={game.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <Label className="cursor-pointer flex-1">{game.name}</Label>
                  </div>
                ))}
              </div>
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

export default ProfileEdit;
