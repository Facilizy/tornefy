-- Add avatar_url and banner_url fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS discord_contact TEXT,
ADD COLUMN IF NOT EXISTS tracker_url TEXT;

-- Create storage bucket for user avatars and banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-profiles', 'user-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user profiles bucket
CREATE POLICY "User profile images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-profiles');

CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);