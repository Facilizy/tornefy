-- Create storage buckets used by the app (public read)
insert into storage.buckets (id, name, public)
values
  ('user-profiles','user-profiles', true),
  ('team-logos','team-logos', true),
  ('team-banners','team-banners', true),
  ('training-banners','training-banners', true),
  ('training-tables','training-tables', true)
on conflict (id) do update set public = excluded.public;

-- Public read access for these buckets
create policy "Public read user-profiles"
  on storage.objects for select
  using (bucket_id = 'user-profiles');

create policy "Public read team-logos"
  on storage.objects for select
  using (bucket_id = 'team-logos');

create policy "Public read team-banners"
  on storage.objects for select
  using (bucket_id = 'team-banners');

create policy "Public read training-banners"
  on storage.objects for select
  using (bucket_id = 'training-banners');

create policy "Public read training-tables"
  on storage.objects for select
  using (bucket_id = 'training-tables');

-- User-scoped write access: only allow writes to paths starting with the user's uid
-- name format: "{uid}/..."
create policy "Users can upload own user-profiles"
  on storage.objects for insert
  with check (
    bucket_id = 'user-profiles'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own user-profiles"
  on storage.objects for update
  using (
    bucket_id = 'user-profiles'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own user-profiles"
  on storage.objects for delete
  using (
    bucket_id = 'user-profiles'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own team-logos"
  on storage.objects for insert
  with check (
    bucket_id = 'team-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own team-logos"
  on storage.objects for update
  using (
    bucket_id = 'team-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own team-logos"
  on storage.objects for delete
  using (
    bucket_id = 'team-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own team-banners"
  on storage.objects for insert
  with check (
    bucket_id = 'team-banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own team-banners"
  on storage.objects for update
  using (
    bucket_id = 'team-banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own team-banners"
  on storage.objects for delete
  using (
    bucket_id = 'team-banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own training-banners"
  on storage.objects for insert
  with check (
    bucket_id = 'training-banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own training-banners"
  on storage.objects for update
  using (
    bucket_id = 'training-banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own training-banners"
  on storage.objects for delete
  using (
    bucket_id = 'training-banners'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own training-tables"
  on storage.objects for insert
  with check (
    bucket_id = 'training-tables'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own training-tables"
  on storage.objects for update
  using (
    bucket_id = 'training-tables'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own training-tables"
  on storage.objects for delete
  using (
    bucket_id = 'training-tables'
    and auth.uid()::text = (storage.foldername(name))[1]
  );