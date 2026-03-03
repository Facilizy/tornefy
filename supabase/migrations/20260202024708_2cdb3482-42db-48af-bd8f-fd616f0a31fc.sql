-- 1) Templates do editor (por organizador)
create table if not exists public.ranking_art_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  training_id text null,
  name text not null,
  format text not null,
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ranking_art_templates_owner_id_idx
  on public.ranking_art_templates (owner_id);

create index if not exists ranking_art_templates_training_id_idx
  on public.ranking_art_templates (training_id);

create index if not exists ranking_art_templates_format_idx
  on public.ranking_art_templates (format);

alter table public.ranking_art_templates enable row level security;

-- SELECT: dono do template ou admin
create policy "ranking_art_templates_select_owner_or_admin"
on public.ranking_art_templates
for select
using (
  (auth.uid() is not null) and (
    owner_id = auth.uid()::text
    or public.has_role(auth.uid(), 'admin')
  )
);

-- INSERT: somente o dono (owner_id = auth.uid)
create policy "ranking_art_templates_insert_owner"
on public.ranking_art_templates
for insert
with check (
  (auth.uid() is not null) and (owner_id = auth.uid()::text)
);

-- UPDATE: dono ou admin (mas mantém owner_id do próprio usuário, para evitar takeover)
create policy "ranking_art_templates_update_owner_or_admin"
on public.ranking_art_templates
for update
using (
  (auth.uid() is not null) and (
    owner_id = auth.uid()::text
    or public.has_role(auth.uid(), 'admin')
  )
)
with check (
  (auth.uid() is not null) and (
    owner_id = auth.uid()::text
    or public.has_role(auth.uid(), 'admin')
  )
);

-- DELETE: dono ou admin
create policy "ranking_art_templates_delete_owner_or_admin"
on public.ranking_art_templates
for delete
using (
  (auth.uid() is not null) and (
    owner_id = auth.uid()::text
    or public.has_role(auth.uid(), 'admin')
  )
);

-- updated_at trigger
create trigger set_ranking_art_templates_updated_at
before update on public.ranking_art_templates
for each row
execute function public.set_updated_at();


-- 2) Bucket privado para assets do editor
insert into storage.buckets (id, name, public)
values ('ranking-art-assets', 'ranking-art-assets', false)
on conflict (id) do nothing;

-- Políticas no storage.objects (acesso por pasta: {userId}/...)
-- Leituras
create policy "ranking_art_assets_read_own"
on storage.objects
for select
using (
  bucket_id = 'ranking-art-assets'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Upload
create policy "ranking_art_assets_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'ranking-art-assets'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Update
create policy "ranking_art_assets_update_own"
on storage.objects
for update
using (
  bucket_id = 'ranking-art-assets'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'ranking-art-assets'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete
create policy "ranking_art_assets_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'ranking-art-assets'
  and auth.uid() is not null
  and auth.uid()::text = (storage.foldername(name))[1]
);
