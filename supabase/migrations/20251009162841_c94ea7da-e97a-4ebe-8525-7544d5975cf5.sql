-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('training-banners', 'training-banners', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('training-tables', 'training-tables', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('game-logos', 'game-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

-- Create storage policies for training-banners
CREATE POLICY "Anyone can view training banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-banners');

CREATE POLICY "Organizers can upload training banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-banners' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'organizer')
);

CREATE POLICY "Organizers can update their training banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-banners' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'organizer')
);

CREATE POLICY "Organizers can delete their training banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-banners' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'organizer')
);

-- Create storage policies for training-tables
CREATE POLICY "Anyone can view training tables"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-tables');

CREATE POLICY "Organizers can upload training tables"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-tables' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'organizer')
);

CREATE POLICY "Organizers can update their training tables"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-tables' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'organizer')
);

CREATE POLICY "Organizers can delete their training tables"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-tables' AND
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'organizer')
);

-- Create storage policies for game-logos
CREATE POLICY "Anyone can view game logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-logos');

-- Create game_type enum
CREATE TYPE game_type AS ENUM ('free_fire', 'blood_strike', 'farlight_84');

-- Add game column to trainings table
ALTER TABLE trainings ADD COLUMN game game_type NOT NULL DEFAULT 'free_fire';