import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type SupportedLanguage } from "@/i18n";
import { PlayerCardFrame } from "@/components/players/PlayerTradingCard";
import { toast } from "sonner";

export interface ProfileFormData {
    full_name: string;
    username: string;
    discord_contact: string;
    discord_url: string;
    tracker_url: string;
    twitter_url: string;
    instagram_url: string;
    youtube_url: string;
    avatar_url: string;
    banner_url: string;
    preferred_games: string[];
    preferred_language: SupportedLanguage;
    player_card_frame_id: string;
    player_function: string;
    available_for_team: boolean;
}

export function useProfileData() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [frames, setFrames] = useState<PlayerCardFrame[]>([]);
    const [loadingFrames, setLoadingFrames] = useState(false);
    const [mainTeam, setMainTeam] = useState<any>(null);

    const [formData, setFormData] = useState<ProfileFormData>({
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
        preferred_games: [],
        preferred_language: "pt-BR",
        player_card_frame_id: "",
        player_function: "",
        available_for_team: false,
    });

    const [coinBalances, setCoinBalances] = useState({
        total: 0,
        pending: 0,
        available: 0,
        frozen: 0,
    });

    const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
    const [twitchConnected, setTwitchConnected] = useState(false);
    const [twitchLogin, setTwitchLogin] = useState<string | null>(null);

    const fetchCoinBalances = useCallback(async (uid: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from("tornecoin_accounts")
                .select("balance_available,balance_pending,balance_frozen")
                .eq("owner_id", uid)
                .eq("owner_type", "user")
                .maybeSingle();

            if (error) throw error;
            const available = Number(data?.balance_available || 0);
            const pending = Number(data?.balance_pending || 0);
            const frozen = Number(data?.balance_frozen || 0);
            const total = available + pending + frozen;
            setCoinBalances({ total, available, pending, frozen });
        } catch {
            setCoinBalances({ total: 0, pending: 0, available: 0, frozen: 0 });
        }
    }, []);

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
        } catch {
            setTwitchConnected(false);
            setTwitchLogin(null);
        }
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

            await refreshTwitchConnection(uid);

            // Main team Fetching Logic
            try {
                const { data: ownedTeam } = await supabase
                    .from("teams")
                    .select("id, tag, name, discord_url, twitter_url, instagram_url, youtube_url, integrated_games")
                    .eq("owner_id", uid)
                    .maybeSingle();

                let mainTeamId: string | undefined;
                let mainTeamRow: any = null;

                if (ownedTeam?.id) {
                    mainTeamId = String(ownedTeam.id);
                    mainTeamRow = ownedTeam;
                } else {
                    const { data: memberRows } = await (supabase as any)
                        .from("team_members")
                        .select("team_id, created_at")
                        .eq("user_id", uid)
                        .order("created_at", { ascending: true })
                        .limit(1);

                    mainTeamId = (memberRows || [])?.[0]?.team_id as string | undefined;
                    if (mainTeamId) {
                        const { data: t } = await (supabase as any)
                            .from("teams")
                            .select("id, tag, name, discord_url, twitter_url, instagram_url, youtube_url, integrated_games")
                            .eq("id", mainTeamId)
                            .maybeSingle();
                        mainTeamRow = t?.id ? t : null;
                    }
                }

                setMainTeam(mainTeamRow?.id ? mainTeamRow : null);

                if (mainTeamRow?.id) {
                    setFormData(p => ({ ...p, available_for_team: false }));
                }

                // Frames loading
                setLoadingFrames(true);
                const { data: fRows } = await supabase
                    .from("player_card_frames")
                    .select("id, slug, name, rarity, accent_hsl, border_hsl, background_hsl, meta")
                    .order("rarity", { ascending: true })
                    .order("name", { ascending: true });

                const baseFrames = (fRows || []) as any[];

                if (mainTeamRow?.id) {
                    try {
                        const teamId = String(mainTeamRow.id);
                        const { data: frameId } = await (supabase as any).rpc("get_or_create_team_frame", { _team_id: teamId });
                        const resolvedFrameId = String(frameId || "");

                        if (resolvedFrameId) {
                            const { data: teamFrame } = await supabase
                                .from("player_card_frames")
                                .select("*")
                                .eq("id", resolvedFrameId)
                                .maybeSingle();

                            const next = teamFrame?.id
                                ? [teamFrame as any, ...baseFrames.filter((f) => String(f.id) !== String(teamFrame.id))]
                                : baseFrames;
                            setFrames(next);
                        } else {
                            setFrames(baseFrames);
                        }
                    } catch {
                        setFrames(baseFrames);
                    }
                } else {
                    setFrames(baseFrames);
                }

            } catch (e) {
                console.warn("Error loading team info or frames", e);
                setMainTeam(null);
            } finally {
                setLoadingFrames(false);
            }

        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const refreshLinkedProviders = async () => {
        const { data } = await supabase.auth.getUser();
        const identities = (data.user?.identities || []) as any[];
        setLinkedProviders(identities.map((i) => i.provider).filter(Boolean));
    };

    const checkUser = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return; // let component handle redirect

        setUser(session.user);
        const identities = (session.user.identities || []) as any[];
        setLinkedProviders(identities.map((i) => i.provider).filter(Boolean));

        await Promise.all([
            fetchProfile(session.user.id),
            fetchCoinBalances(session.user.id)
        ]);
    }, [fetchCoinBalances]);

    useEffect(() => {
        checkUser();

        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            refreshLinkedProviders();
        });
        return () => sub.subscription.unsubscribe();
    }, [checkUser]);

    return {
        user,
        loading,
        formData,
        setFormData,
        frames,
        loadingFrames,
        mainTeam,
        coinBalances,
        linkedProviders,
        twitchConnected,
        twitchLogin,
        fetchCoinBalances,
        refreshTwitchConnection,
        refreshLinkedProviders
    };
}
