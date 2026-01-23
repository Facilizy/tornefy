import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n, type SupportedLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { TwitchMark } from "@/components/twitch/TwitchMark";
import { ArrowLeft, Upload, User, Loader2, Gamepad2, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  PlayerTradingCard,
  type PlayerCardFrame,
  type PlayerTradingCardData,
} from "@/components/players/PlayerTradingCard";

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
  const { language, setLanguage } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingBanner, setRemovingBanner] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  const [mainTeam, setMainTeam] = useState<any>(null);

  const [connectingTwitch, setConnectingTwitch] = useState(false);
  const [syncingTwitch, setSyncingTwitch] = useState(false);
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [twitchLogin, setTwitchLogin] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    discord_contact: "",
    discord_url: "",
    tracker_url: "",
    twitter_url: "",
    instagram_url: "",
    youtube_url: "",
    avatar_url: "",
    banner_url: "",
    preferred_games: [] as string[],
    preferred_language: "pt-BR" as SupportedLanguage,
    player_card_frame_id: "" as string,
    player_function: "" as string,
    available_for_team: false as boolean,
  });

  const [frames, setFrames] = useState<PlayerCardFrame[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(false);

  useEffect(() => {
    checkUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event) => {
      // If we returned from an OAuth redirect (linkIdentity), refresh providers.
      refreshLinkedProviders();
      setLinkingDiscord(false);
      setLinkingGoogle(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the page received OAuth params, clean the URL after hydration.
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const hasTwitchParams = sp.has("code") && sp.has("state") && sp.has("scope");
    if (hasTwitchParams) {
      const supabaseUrl = (supabase as any)?.supabaseUrl as string | undefined;
      if (supabaseUrl) {
        window.location.replace(`${supabaseUrl}/functions/v1/twitch-oauth-callback${location.search}`);
      }
      return;
    }

    const hasAuthOAuthParams =
      location.search.includes("error=") ||
      location.hash.includes("access_token=") ||
      location.hash.includes("error=");

    if (hasAuthOAuthParams) {
      // Replace URL to avoid re-processing on refresh
      navigate("/profile/edit", { replace: true });
    }
  }, [location.search, location.hash, navigate]);

  // Handle twitch=connected feedback
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("twitch") === "connected") {
      toast.success("Twitch conectado com sucesso!");
      // refresh connected status
      if (user?.id) refreshTwitchConnection(user.id);
      // cleanup url param
      sp.delete("twitch");
      const next = sp.toString();
      navigate(next ? `/profile/edit?${next}` : "/profile/edit", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate, user?.id]);

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
        discord_url: (data as any).discord_url || "",
        tracker_url: data.tracker_url || "",
        twitter_url: (data as any).twitter_url || "",
        instagram_url: (data as any).instagram_url || "",
        youtube_url: (data as any).youtube_url || "",
        avatar_url: data.avatar_url || "",
        banner_url: data.banner_url || "",
        preferred_games: preferredGames,
        preferred_language:
          (data as any)?.preferred_language === "en" || (data as any)?.preferred_language === "es"
            ? (data as any).preferred_language
            : "pt-BR",
        player_card_frame_id: (data as any)?.player_card_frame_id || "",
        player_function: ((data as any)?.player_function as string | null) || "",
        available_for_team: !!(data as any)?.available_for_team,
      });

      // Keep UI language synced with profile preference.
      const profileLang = (data as any)?.preferred_language as SupportedLanguage | undefined;
      if (profileLang && profileLang !== language) setLanguage(profileLang);

      await refreshTwitchConnection(uid);

      // Main team (oldest membership)
      try {
        const { data: memberRows } = await (supabase as any)
          .from("team_members")
          .select("team_id, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: true })
          .limit(1);
        const mainTeamId = (memberRows || [])?.[0]?.team_id as string | undefined;
        if (mainTeamId) {
          const { data: t } = await (supabase as any)
            .from("teams")
            .select(
              "id, tag, name, discord_url, twitter_url, instagram_url, youtube_url, integrated_games"
            )
            .eq("id", mainTeamId)
            .maybeSingle();
          setMainTeam(t?.id ? t : null);

          // If user has a team, availability must not be enabled.
          setFormData((p) => ({ ...p, available_for_team: false }));
        } else {
          setMainTeam(null);
        }
      } catch {
        setMainTeam(null);
      }

      // load frames
      setLoadingFrames(true);
      const { data: fRows } = await supabase
        .from("player_card_frames")
        .select("id, slug, name, rarity, accent_hsl, border_hsl, background_hsl, meta")
        .order("rarity", { ascending: true })
        .order("name", { ascending: true });
      setFrames((fRows || []) as any);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
      setLoadingFrames(false);
    }
  };

  const refreshTwitchConnection = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("twitch_live_status")
        .select("twitch_login")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;

      setTwitchConnected(!!data?.twitch_login);
      setTwitchLogin(data?.twitch_login || null);
    } catch (e) {
      // keep silent
      setTwitchConnected(false);
      setTwitchLogin(null);
    }
  };

  const handleConnectTwitch = async () => {
    if (!user?.id) return;
    try {
      setConnectingTwitch(true);
      const { data, error } = await supabase.functions.invoke("twitch-oauth-start", {
        body: {
          redirectTo: `${window.location.origin}/profile/edit`,
        },
      });
      if (error) throw error;

      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error("URL de autorização não retornada");
      window.location.assign(url);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao conectar Twitch");
      setConnectingTwitch(false);
    }
  };

  const handleSyncTwitch = async () => {
    try {
      setSyncingTwitch(true);
      const { data, error } = await supabase.functions.invoke("twitch-sync-live", {
        body: {},
      });
      if (error) throw error;
      await refreshTwitchConnection(user?.id);
      if ((data as any)?.is_live) toast.success("Status atualizado: AO VIVO");
      else toast.success("Status atualizado");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao atualizar status da Twitch");
    } finally {
      setSyncingTwitch(false);
    }
  };

  const handleDisconnectTwitch = async () => {
    if (!twitchConnected) return;
    if (!window.confirm("Desconectar Twitch desta conta?")) return;

    try {
      setSyncingTwitch(true);
      const { error } = await supabase.functions.invoke("twitch-disconnect", { body: {} });
      if (error) throw error;
      toast.success("Twitch desconectada.");
      await refreshTwitchConnection(user?.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao desconectar Twitch");
    } finally {
      setSyncingTwitch(false);
    }
  };

  const deleteUserProfileFilesByPrefix = async (uid: string, prefix: "avatar" | "banner") => {
    const { data, error } = await supabase.storage
      .from("user-profiles")
      .list(uid, { limit: 100, offset: 0 });
    if (error) throw error;

    const toRemove = (data || [])
      .map((f) => f.name)
      .filter((name) => name.startsWith(`${prefix}.`))
      .map((name) => `${uid}/${name}`);

    if (toRemove.length === 0) return;

    const { error: rmError } = await supabase.storage.from("user-profiles").remove(toRemove);
    if (rmError) throw rmError;
  };

  const handleRemoveBanner = async () => {
    if (!user?.id) return;
    try {
      setRemovingBanner(true);
      await deleteUserProfileFilesByPrefix(user.id, "banner");
      setFormData((p) => ({ ...p, banner_url: "" }));
      toast.success("Banner removido!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao remover banner");
    } finally {
      setRemovingBanner(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;
    try {
      setRemovingAvatar(true);
      await deleteUserProfileFilesByPrefix(user.id, "avatar");
      setFormData((p) => ({ ...p, avatar_url: "" }));
      toast.success("Foto removida!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao remover foto");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
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
        .upload(fileName, file, { upsert: true, cacheControl: "3600", contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(fileName);

      setFormData({ ...formData, banner_url: `${publicUrl}?t=${Date.now()}` });
      toast.success("Banner atualizado!");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao fazer upload do banner");
      console.error("Upload banner error:", error);
    } finally {
      setUploadingBanner(false);
      // allow re-uploading the same file
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
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
        .upload(fileName, file, { upsert: true, cacheControl: "3600", contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-profiles")
        .getPublicUrl(fileName);

      setFormData({ ...formData, avatar_url: `${publicUrl}?t=${Date.now()}` });
      toast.success("Foto atualizada!");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao fazer upload da foto");
      console.error("Upload avatar error:", error);
    } finally {
      setUploadingAvatar(false);
      // allow re-uploading the same file
      if (avatarInputRef.current) avatarInputRef.current.value = "";
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
          discord_url: formData.discord_url || null,
          tracker_url: formData.tracker_url || null,
          twitter_url: formData.twitter_url || null,
          instagram_url: formData.instagram_url || null,
          youtube_url: formData.youtube_url || null,
          avatar_url: formData.avatar_url || null,
          banner_url: formData.banner_url || null,
          preferred_games: formData.preferred_games.length > 0 ? formData.preferred_games : ["free_fire"],
          preferred_language: formData.preferred_language,
          player_card_frame_id: formData.player_card_frame_id || null,
          player_function: formData.player_function || null,
          available_for_team: mainTeam?.id ? false : !!formData.available_for_team,
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

  const handleLinkGoogle = async () => {
    try {
      setLinkingGoogle(true);
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/profile/edit`,
        },
      });
      if (error) throw error;

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (e: any) {
      const msg = e?.message || "Erro ao conectar Google";
      if (String(e?.code) === "manual_linking_disabled" || msg.toLowerCase().includes("manual linking")) {
        toast.error(
          "O Supabase está com 'Manual linking' desativado para Google. Ative em Authentication → Providers → Google."
        );
      } else {
        toast.error(msg);
      }
      setLinkingGoogle(false);
    }
  };

  if (loading) {
    return (
      <MainLayout showUpcomingScrimWidget={false}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showUpcomingScrimWidget={false}>
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

        {/* Language */}
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/40 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Idioma</p>
            <p className="text-xs text-muted-foreground">Define o idioma padrão da sua conta.</p>
          </div>
          <LanguageSelector
            value={formData.preferred_language}
            onChange={(lang) => {
              setFormData((p) => ({ ...p, preferred_language: lang }));
              setLanguage(lang);
            }}
          />
        </div>

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
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleBannerUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Tamanho máximo: 5MB. Formatos: JPG, PNG, GIF
              </p>

              {formData.banner_url ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="px-0 text-muted-foreground hover:text-foreground"
                  onClick={handleRemoveBanner}
                  disabled={removingBanner}
                >
                  Remover banner
                </Button>
              ) : null}
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

                {formData.avatar_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleRemoveAvatar}
                    disabled={removingAvatar}
                  >
                    Remover foto
                  </Button>
                ) : null}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                 accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
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

            {/* Moldura do cartão */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold uppercase mb-1">Moldura do cartão</h2>
                <p className="text-sm text-muted-foreground">
                  Escolha uma moldura (raridade/skin) para o seu cartão.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Selecionar</p>
                  <div className="mt-3">
                    <select
                      value={formData.player_card_frame_id || ""}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, player_card_frame_id: e.target.value }))
                      }
                      className="w-full h-10 rounded-md border border-border bg-background/50 px-3 text-sm"
                      disabled={loadingFrames}
                    >
                      <option value="">Sem moldura</option>
                      {frames.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({String(f.rarity).toUpperCase()})
                        </option>
                      ))}
                    </select>
                    {loadingFrames ? (
                      <p className="mt-2 text-xs text-muted-foreground">Carregando molduras...</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
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
                          ? frames.find((f) => f.id === formData.player_card_frame_id) || null
                          : null
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Jogos Preferidos */}

            {/* Social Section (estilo referência) */}
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

                <div className="rounded-lg border border-border bg-card/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold">Contas conectadas</p>
                      <p className="text-xs text-muted-foreground">
                        Conecte provedores para entrar sem senha e manter a mesma conta.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
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

                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={handleLinkGoogle}
                        disabled={linkingGoogle || linkedProviders.includes("google")}
                      >
                        {linkingGoogle ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <GoogleMark className="w-4 h-4 mr-2" />
                        )}
                        {linkedProviders.includes("google") ? "Google conectado" : "Conectar Google"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={handleConnectTwitch}
                        disabled={connectingTwitch || twitchConnected}
                      >
                        {connectingTwitch ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <TwitchMark className="w-4 h-4 mr-2" />
                        )}
                        {twitchConnected
                          ? `Twitch conectado${twitchLogin ? ` (@${twitchLogin})` : ""}`
                          : "Conectar Twitch"}
                      </Button>
                    </div>
                  </div>

                  {twitchConnected && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleSyncTwitch}
                        disabled={syncingTwitch}
                      >
                        {syncingTwitch ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <TwitchMark className="w-4 h-4 mr-2" />
                        )}
                        Atualizar status
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDisconnectTwitch}
                        disabled={syncingTwitch}
                      >
                        Desconectar
                      </Button>
                      {twitchLogin && (
                        <a
                          href={`https://twitch.tv/${twitchLogin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Abrir canal
                        </a>
                      )}
                    </div>
                  )}

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

                {/* Push notifications removed per request. */}
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

const GoogleMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M21.35 11.1H12v3.8h5.34c-.23 1.25-.95 2.3-2.05 3.02v2.5h3.32c1.95-1.8 3.07-4.45 3.07-7.57 0-.7-.06-1.38-.33-2.75z"
    />
    <path
      fill="currentColor"
      d="M12 22c2.79 0 5.12-.92 6.83-2.5l-3.32-2.5c-.92.62-2.1.98-3.51.98-2.7 0-4.98-1.82-5.8-4.27H2.78v2.68C4.48 19.98 8.01 22 12 22z"
    />
    <path
      fill="currentColor"
      d="M6.2 13.71A5.99 5.99 0 0 1 5.9 12c0-.6.1-1.18.3-1.71V7.61H2.78A9.98 9.98 0 0 0 2 12c0 1.61.39 3.13.78 4.39l3.42-2.68z"
    />
    <path
      fill="currentColor"
      d="M12 6.02c1.52 0 2.88.52 3.95 1.55l2.96-2.96C17.12 2.91 14.79 2 12 2 8.01 2 4.48 4.02 2.78 7.61l3.42 2.68C7.02 7.84 9.3 6.02 12 6.02z"
    />
  </svg>
);

export default ProfileEdit;
