-- Fix critical security vulnerability: Prevent Discord username harvesting
-- Remove organizer access to team_members to prevent malicious data collection

-- Drop the policy that allows organizers to view team members
DROP POLICY IF EXISTS "Organizers can view registered team members" ON public.team_members;

-- Keep only the team owner policy
-- Team owners can view their own team members (this is secure)
-- Organizers will NOT have access to Discord usernames, preventing harvesting attacks

-- If organizers need to contact teams, they should use the team owner contact
-- or implement a separate, secure messaging system

-- Add comment explaining the security decision
COMMENT ON TABLE public.team_members IS 'Contains sensitive player information (Discord usernames, game IDs). Only team owners should have SELECT access to prevent harvesting attacks by malicious organizers.';