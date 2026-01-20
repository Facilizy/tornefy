// Helper file for Supabase types
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

// Re-export client
export const db = supabase;

// Type helpers
export type Profile = Tables<"profiles">;
export type Team = Tables<"teams">;
export type TeamMember = Tables<"team_members">;
export type Training = Tables<"trainings">;
export type TrainingRegistration = Tables<"training_registrations">;
