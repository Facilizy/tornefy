import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Training,
    TrainingRegistrationWithTeam,
    OrganizerProfile,
    TrainingAccess,
    Team,
    TrainingRoundSlot
} from "@/types/domain";
import { fetchVerifiedMap } from "@/hooks/useVerifiedEntities";

export function useTrainingData(trainingId: string | undefined, userId: string | undefined) {
    const [training, setTraining] = useState<Training | null>(null);
    const [loading, setLoading] = useState(true);

    // Organizer data
    const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
    const [isVerifiedOrganizer, setIsVerifiedOrganizer] = useState(false);
    const [isVerifiedOrganizerRole, setIsVerifiedOrganizerRole] = useState(false);
    const [organizerUpcomingTrainings, setOrganizerUpcomingTrainings] = useState<any[]>([]);

    // Registration data
    const [registeredTeams, setRegisteredTeams] = useState<TrainingRegistrationWithTeam[]>([]);
    const [registeredTeamsCount, setRegisteredTeamsCount] = useState(0);
    const [registeredTeamsLoading, setRegisteredTeamsLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);

    // Access control
    const [trainingAccess, setTrainingAccess] = useState<TrainingAccess | null>(null);
    const [allowedPlans, setAllowedPlans] = useState<any[]>([]);
    const [membershipsByPlanId, setMembershipsByPlanId] = useState<Record<string, any | null>>({});

    // Scores
    const [hasAnyScores, setHasAnyScores] = useState(false);
    const [scoresLoading, setScoresLoading] = useState(false);

    // Scrim groups
    const [scrimGroups, setScrimGroups] = useState<any[]>([]);
    const [scrimGroupTeams, setScrimGroupTeams] = useState<any[]>([]);

    // Round slots
    const [roundSlotsByTeamId, setRoundSlotsByTeamId] = useState<Map<string, number>>(new Map());

    // Waitlist & Check-in
    const [waitlistCount, setWaitlistCount] = useState(0);
    const [isInWaitlist, setIsInWaitlist] = useState(false);
    const [hasCheckedIn, setHasCheckedIn] = useState(false);

    const fetchTrainingDetails = useCallback(async () => {
        if (!trainingId) return;

        try {
            setLoading(true);
            setRegisteredTeamsLoading(!!userId);
            setScoresLoading(true);

            const { data: trainingData, error: trainingError } = await supabase
                .from("trainings")
                .select("*")
                .eq("id", trainingId)
                .single();

            if (trainingError) throw trainingError;
            setTraining(trainingData);

            // Subscription gating (multi-plan)
            try {
                const { data: accessRow, error: accessErr } = await (supabase as any).rpc("get_my_training_access", {
                    _training_id: String((trainingData as any)?.id ?? trainingId ?? ""),
                });
                if (accessErr) throw accessErr;

                const mode = String(accessRow?.mode || "public") as "public" | "members_only";
                const eligible = !!accessRow?.eligible;
                const matchedPlanId = accessRow?.matched_plan_id ? String(accessRow.matched_plan_id) : null;
                const plans = Array.isArray(accessRow?.allowed_plans) ? accessRow.allowed_plans : [];

                setTrainingAccess({ mode, eligible, matched_plan_id: matchedPlanId });
                setAllowedPlans(plans);

                if (userId && plans.length > 0) {
                    const membershipPairs = await Promise.all(
                        plans.map(async (p: any) => {
                            const pid = String(p?.id || "");
                            if (!pid) return [pid, null] as const;
                            const { data: m } = await (supabase as any).rpc("get_my_plan_membership", { _plan_id: pid });
                            return [pid, m || null] as const;
                        })
                    );
                    setMembershipsByPlanId(Object.fromEntries(membershipPairs.filter(([pid]) => !!pid)));
                } else {
                    setMembershipsByPlanId({});
                }
            } catch {
                setTrainingAccess(null);
                setAllowedPlans([]);
                setMembershipsByPlanId({});
            }

            // Check scores
            try {
                const { data: matchIds } = await supabase
                    .from("training_matches")
                    .select("id")
                    .eq("training_id", trainingId);

                const ids = (matchIds || []).map((m: any) => m.id);

                const { data: anyScore } = await supabase
                    .from("training_match_scores")
                    .select("id")
                    .in("match_id", ids.length > 0 ? ids : [""])
                    .limit(1)
                    .maybeSingle();

                setHasAnyScores(!!anyScore);
            } catch {
                setHasAnyScores(false);
            } finally {
                setScoresLoading(false);
            }

            // Organizer info
            if (trainingData?.organizer_id) {
                const organizerId = trainingData.organizer_id;

                const [organizerInfo, upcomingRes] = await Promise.all([
                    Promise.all([
                        supabase
                            .from("profiles")
                            .select("id, username, full_name, avatar_url")
                            .eq("id", organizerId)
                            .maybeSingle(),
                        supabase
                            .from("trainings")
                            .select("id", { count: "exact", head: true })
                            .eq("organizer_id", organizerId),
                    ]),
                    supabase
                        .from("trainings")
                        .select("id, name, datetime, status, platform, mode, game")
                        .eq("organizer_id", organizerId)
                        .neq("id", trainingId)
                        .gt("datetime", new Date().toISOString())
                        .order("datetime", { ascending: true })
                        .limit(3),
                ]);

                const [{ data: organizerP }, { count: totalTrainings }] = organizerInfo;

                let verifiedByEntities = false;
                try {
                    const map = await fetchVerifiedMap("user", [String(organizerId)]);
                    verifiedByEntities = !!map.get(String(organizerId));
                } catch {
                    verifiedByEntities = false;
                }

                let verifiedByLegacyRole = false;
                if (!verifiedByEntities) {
                    try {
                        const { data } = await (supabase as any).rpc("is_organizer_verified", { _user_id: organizerId });
                        verifiedByLegacyRole = !!data;
                    } catch {
                        verifiedByLegacyRole = false;
                    }
                }

                setOrganizerProfile(organizerP);
                setIsVerifiedOrganizer((totalTrainings || 0) >= 10);
                setIsVerifiedOrganizerRole(verifiedByEntities || verifiedByLegacyRole);
                setOrganizerUpcomingTrainings(upcomingRes.data || []);
            } else {
                setOrganizerProfile(null);
                setIsVerifiedOrganizer(false);
                setIsVerifiedOrganizerRole(false);
                setOrganizerUpcomingTrainings([]);
            }

            // Registrations
            if (!userId) {
                const { count } = await supabase
                    .from("training_registrations")
                    .select("id", { count: "exact", head: true })
                    .eq("training_id", trainingId);

                setRegisteredTeamsCount(count || 0);
                setRegisteredTeams([]);
                setIsRegistered(false);
                setRegisteredTeamsLoading(false);
            } else {
                const { data: registrationsData, error: registrationsError } = await supabase
                    .from("training_registrations")
                    .select(
                        `
            *,
            teams (
              id,
              name,
              tag,
              logo_url,
              owner_id,
              is_external
            )
          `
                    )
                    .eq("training_id", trainingId);

                if (registrationsError) throw registrationsError;

                // Cast to our domain type
                const regs = (registrationsData || []) as any as TrainingRegistrationWithTeam[];
                setRegisteredTeams(regs);
                setRegisteredTeamsCount(regs.length);

                const myRegistration = regs.find((reg) => reg.teams?.owner_id === userId);
                setIsRegistered(!!myRegistration);
            }

            // Scrim groups check
            if (trainingData?.use_groups) {
                try {
                    const gRes = await supabase
                        .from("scrim_groups")
                        .select("id, name, sort_order")
                        .eq("training_id", trainingId)
                        .order("sort_order", { ascending: true })
                        .order("created_at", { ascending: true });

                    if (!gRes.error && Array.isArray(gRes.data) && gRes.data.length > 0) {
                        const groups = gRes.data;
                        setScrimGroups(groups);

                        const groupIds = groups.map((g) => String(g.id));
                        const gtRes = await supabase
                            .from("scrim_group_teams")
                            .select("id, group_id, team_id")
                            .in("group_id", groupIds);

                        if (!gtRes.error) setScrimGroupTeams((gtRes.data || []) as any);
                        else setScrimGroupTeams([]);
                    } else {
                        setScrimGroups([]);
                        setScrimGroupTeams([]);
                    }
                } catch {
                    setScrimGroups([]);
                    setScrimGroupTeams([]);
                }
            } else {
                setScrimGroups([]);
                setScrimGroupTeams([]);
            }

            // Waitlist & Check-in check
            try {
                const { count } = await (supabase as any)
                    .from("training_waitlist")
                    .select("id", { count: "exact", head: true })
                    .eq("training_id", trainingId)
                    .eq("status", "active");
                setWaitlistCount(count || 0);

                if (userId) {
                    // Get user's team first
                    const { data: teamData } = await supabase
                        .from("teams")
                        .select("id")
                        .eq("owner_id", userId)
                        .maybeSingle();

                    if (teamData) {
                        const [{ data: w }, { data: c }] = await Promise.all([
                            (supabase as any)
                                .from("training_waitlist")
                                .select("id")
                                .eq("training_id", trainingId)
                                .eq("team_id", teamData.id)
                                .eq("status", "active")
                                .maybeSingle(),
                            (supabase as any)
                                .from("training_checkins")
                                .select("id")
                                .eq("training_id", trainingId)
                                .eq("team_id", teamData.id)
                                .maybeSingle(),
                        ]);

                        setIsInWaitlist(!!w);
                        setHasCheckedIn(!!c);
                    } else {
                        setIsInWaitlist(false);
                        setHasCheckedIn(false);
                    }
                } else {
                    setIsInWaitlist(false);
                    setHasCheckedIn(false);
                }
            } catch (e) {
                console.warn("fetch waitlist/checkin failed", e);
            }

        } catch (error: any) {
            toast.error("Erro ao carregar detalhes do treino");
            console.error(error);
        } finally {
            setRegisteredTeamsLoading(false);
            setLoading(false);
        }
    }, [trainingId, userId]);

    useEffect(() => {
        fetchTrainingDetails();
    }, [fetchTrainingDetails]);

    // Real-time updates
    useEffect(() => {
        if (!trainingId) return;

        const channel = supabase
            .channel(`rt-training-reg-${trainingId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "training_registrations", filter: `training_id=eq.${trainingId}` },
                () => {
                    // Debounced refetch could be better, but direct call for now
                    setTimeout(() => fetchTrainingDetails(), 500);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [trainingId, fetchTrainingDetails]);

    return {
        training,
        loading,
        organizerProfile,
        isVerifiedOrganizer,
        isVerifiedOrganizerRole,
        organizerUpcomingTrainings,
        registeredTeams,
        registeredTeamsCount,
        registeredTeamsLoading,
        isRegistered,
        trainingAccess,
        allowedPlans,
        membershipsByPlanId,
        hasAnyScores,
        scoresLoading,
        scrimGroups,
        scrimGroupTeams,
        roundSlotsByTeamId,
        waitlistCount,
        isInWaitlist,
        hasCheckedIn,
        refetch: fetchTrainingDetails
    };
}
