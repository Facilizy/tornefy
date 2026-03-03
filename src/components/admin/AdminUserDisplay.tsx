import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export function AdminUserDisplay({ userId, showId = false }: { userId: string; showId?: boolean }) {
    const { data: profile, isLoading } = useQuery({
        queryKey: ["admin", "profile", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url")
                .eq("id", userId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    if (isLoading) {
        return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    }

    if (!profile) {
        return <span className="text-muted-foreground text-xs">{userId.slice(0, 8)}...</span>;
    }

    return (
        <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>{(profile.username || profile.full_name || "?")[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">
                    {profile.username || profile.full_name || "Sem nome"}
                </span>
                {showId && <span className="text-[10px] text-muted-foreground">{userId}</span>}
            </div>
        </div>
    );
}
