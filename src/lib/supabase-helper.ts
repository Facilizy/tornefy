// Helper file to ensure proper TypeScript type inference
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Re-export with explicit typing to help TypeScript
export const db = supabase as unknown as typeof supabase;

// Type helpers for better inference
export type Tables = Database['public']['Tables'];
export type Profile = Tables['profiles']['Row'];
export type Team = Tables['teams']['Row'];
export type TeamMember = Tables['team_members']['Row'];
export type Training = Tables['trainings']['Row'];
export type TrainingRegistration = Tables['training_registrations']['Row'];
