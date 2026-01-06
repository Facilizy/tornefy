-- Add new columns to teams table for enhanced team management
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'BR',
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'PC',
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#DC2626',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1F2937',
ADD COLUMN IF NOT EXISTS discord_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 1000;

-- Add preferred_games to profiles for game recommendations
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_games TEXT[] DEFAULT ARRAY['free_fire']::TEXT[];

-- Create team-banners storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-banners', 'team-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for team-banners bucket
CREATE POLICY "Team banners are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-banners');

CREATE POLICY "Users can upload their own team banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own team banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own team banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-banners' AND auth.uid()::text = (storage.foldername(name))[1]);