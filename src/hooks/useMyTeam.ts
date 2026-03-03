import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types/domain";

export function useMyTeam(userId: string | undefined) {
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    const [myTeamLines, setMyTeamLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) {
            setMyTeam(null);
            setMyTeamLines([]);
            return;
        }

        const fetchTeam = async () => {
            setLoading(true);
            const { data } = await supabase.from("teams").select("*").eq("owner_id", userId).maybeSingle();

            setMyTeam(data);

            if (data) {
                const { data: lines } = await supabase
                    .from("team_lines")
                    .select("*")
                    .eq("team_id", data.id)
                    .order("created_at", { ascending: true });

                setMyTeamLines(lines || []);
            }
            setLoading(false);
        };

        fetchTeam();
    }, [userId]);

    return { myTeam, myTeamLines, loading };
}
