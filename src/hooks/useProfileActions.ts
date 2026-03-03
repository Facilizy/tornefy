import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProfileFormData } from "./useProfileData";

export function useProfileActions(
    user: any,
    formData: ProfileFormData,
    setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>,
    refreshTwitchConnection: (uid: string) => Promise<void>,
    refreshLinkedProviders: () => Promise<void>,
    mainTeam: any
) {
    const [saving, setSaving] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [removingBanner, setRemovingBanner] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);
    const [linkingDiscord, setLinkingDiscord] = useState(false);
    const [linkingGoogle, setLinkingGoogle] = useState(false);
    const [connectingTwitch, setConnectingTwitch] = useState(false);
    const [syncingTwitch, setSyncingTwitch] = useState(false);

    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

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
            // Optionally navigate or just stay
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
            const url = (data as any)?.url;
            if (!url) throw new Error("URL não retornada");
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
            const { data, error } = await supabase.functions.invoke("twitch-sync-live", { body: {} });
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
        if (!window.confirm("Desconectar Twitch?")) return;
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

    const handleLinkDiscord = async () => {
        try {
            setLinkingDiscord(true);
            const { data, error } = await supabase.auth.linkIdentity({
                provider: "discord",
                options: { redirectTo: `${window.location.origin}/profile/edit` },
            });
            if (error) throw error;
            if (data?.url) window.location.assign(data.url);
        } catch (e: any) {
            toast.error(e?.message || "Erro ao conectar Discord");
            setLinkingDiscord(false);
        }
    };

    const handleLinkGoogle = async () => {
        try {
            setLinkingGoogle(true);
            const { data, error } = await supabase.auth.linkIdentity({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/profile/edit` },
            });
            if (error) throw error;
            if (data?.url) window.location.assign(data.url);
        } catch (e: any) {
            toast.error(e?.message || "Erro ao conectar Google");
            setLinkingGoogle(false);
        }
    };

    return {
        saving,
        uploadingBanner,
        uploadingAvatar,
        removingBanner,
        removingAvatar,
        linkingDiscord,
        linkingGoogle,
        connectingTwitch,
        syncingTwitch,
        bannerInputRef,
        avatarInputRef,
        handleBannerUpload,
        handleAvatarUpload,
        handleRemoveBanner,
        handleRemoveAvatar,
        handleSubmit,
        handleConnectTwitch,
        handleSyncTwitch,
        handleDisconnectTwitch,
        handleLinkDiscord,
        handleLinkGoogle
    };
}
