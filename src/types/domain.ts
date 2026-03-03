import { Database } from "@/integrations/supabase/types";

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Training = Database['public']['Tables']['trainings']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TrainingRegistration = Database['public']['Tables']['training_registrations']['Row'];
export type TrainingMatch = Database['public']['Tables']['training_matches']['Row'];
export type TrainingMatchScore = Database['public']['Tables']['training_match_scores']['Row'];
export type ScrimGroup = Database['public']['Tables']['scrim_groups']['Row'];
export type ScrimGroupTeam = Database['public']['Tables']['scrim_group_teams']['Row'];
export type TrainingRoundSlot = Database['public']['Tables']['training_round_slots']['Row'];

// Extended types (joins)
export type TrainingRegistrationWithTeam = TrainingRegistration & {
  teams: Pick<Team, 'id' | 'name' | 'tag' | 'logo_url' | 'owner_id' | 'is_external'> | null;
};

export type OrganizerProfile = Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>;

export type TrainingAccess = {
  mode: "public" | "members_only";
  eligible: boolean;
  matched_plan_id: string | null;
};
