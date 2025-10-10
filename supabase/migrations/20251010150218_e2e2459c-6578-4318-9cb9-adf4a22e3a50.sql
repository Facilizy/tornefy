-- Create team-logos storage bucket
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true);

-- Create storage policies for team-logos
CREATE POLICY "Team logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Team owners can upload their logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Team owners can update their logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'team-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Team owners can delete their logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);