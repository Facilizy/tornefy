-- Player card frames (molduras)
create table if not exists public.player_card_frames (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  rarity text not null default 'common',
  -- HSL tokens to be applied client-side (kept as text to avoid tight constraints)
  accent_hsl text null,
  border_hsl text null,
  background_hsl text null,
  -- optional metadata for future skins (e.g. pattern asset key)
  meta jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_card_frames enable row level security;

-- Public read so cards can render for everyone
create policy "Player card frames are publicly visible"
on public.player_card_frames
for select
using (true);

-- No client writes by default
create policy "No client inserts player card frames"
on public.player_card_frames
for insert
with check (false);

create policy "No client updates player card frames"
on public.player_card_frames
for update
using (false)
with check (false);

create policy "No client deletes player card frames"
on public.player_card_frames
for delete
using (false);

-- Add selected frame to profiles
alter table public.profiles
add column if not exists player_card_frame_id uuid null;

alter table public.profiles
add constraint profiles_player_card_frame_id_fkey
foreign key (player_card_frame_id)
references public.player_card_frames(id)
on delete set null;

-- updated_at trigger helper (safe if already exists)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_player_card_frames_updated_at on public.player_card_frames;
create trigger trg_player_card_frames_updated_at
before update on public.player_card_frames
for each row
execute function public.update_updated_at_column();

-- Seed a few default frames
insert into public.player_card_frames (slug, name, rarity, accent_hsl, border_hsl, background_hsl, meta)
values
  ('classic', 'Clássica', 'common', '222 84% 60%', '222 84% 60%', '0 0% 100%', jsonb_build_object('style','classic')),
  ('neon', 'Neon', 'rare', '190 90% 55%', '190 90% 55%', '220 15% 8%', jsonb_build_object('style','neon')),
  ('royal', 'Royal', 'epic', '38 92% 55%', '38 92% 55%', '230 18% 10%', jsonb_build_object('style','royal'))
on conflict (slug) do nothing;