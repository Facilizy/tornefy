-- Fix CRITICAL: enable RLS on public.discord_active_resources (currently unprotected)
alter table public.discord_active_resources enable row level security;

-- Deny all client access by default (data should be managed by backend processes only)
create policy "discord_active_resources_deny_select"
on public.discord_active_resources
for select
using (false);

create policy "discord_active_resources_deny_insert"
on public.discord_active_resources
for insert
with check (false);

create policy "discord_active_resources_deny_update"
on public.discord_active_resources
for update
using (false)
with check (false);

create policy "discord_active_resources_deny_delete"
on public.discord_active_resources
for delete
using (false);
