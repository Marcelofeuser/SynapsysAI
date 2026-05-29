create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_synapsys_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.synapsys_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#50c8ff',
  icon text not null default 'folder',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.synapsys_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  project_id uuid references public.synapsys_projects(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_opened_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.synapsys_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.synapsys_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool', 'support')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.synapsys_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'pt-BR',
  show_sources boolean not null default true,
  web_search_enabled boolean not null default true,
  response_style text not null default 'standard',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.synapsys_platform_updates (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  description text not null,
  type text not null check (type in ('new', 'improvement', 'fix')),
  published_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_synapsys_projects_user_id
  on public.synapsys_projects (user_id, archived_at, updated_at desc);

create index if not exists idx_synapsys_projects_name_trgm
  on public.synapsys_projects using gin (name gin_trgm_ops);

create index if not exists idx_synapsys_conversations_user_id
  on public.synapsys_conversations (user_id, archived_at, updated_at desc);

create index if not exists idx_synapsys_conversations_project_id
  on public.synapsys_conversations (project_id, updated_at desc);

create index if not exists idx_synapsys_conversations_title_trgm
  on public.synapsys_conversations using gin (title gin_trgm_ops);

create index if not exists idx_synapsys_conversations_last_opened_at
  on public.synapsys_conversations (user_id, last_opened_at desc);

create index if not exists idx_synapsys_messages_conversation_id
  on public.synapsys_conversation_messages (conversation_id, created_at asc);

create index if not exists idx_synapsys_messages_content_trgm
  on public.synapsys_conversation_messages using gin (content gin_trgm_ops);

drop trigger if exists trg_synapsys_projects_updated_at on public.synapsys_projects;
create trigger trg_synapsys_projects_updated_at
before update on public.synapsys_projects
for each row
execute function public.set_synapsys_updated_at();

drop trigger if exists trg_synapsys_conversations_updated_at on public.synapsys_conversations;
create trigger trg_synapsys_conversations_updated_at
before update on public.synapsys_conversations
for each row
execute function public.set_synapsys_updated_at();

drop trigger if exists trg_synapsys_user_settings_updated_at on public.synapsys_user_settings;
create trigger trg_synapsys_user_settings_updated_at
before update on public.synapsys_user_settings
for each row
execute function public.set_synapsys_updated_at();

create or replace function public.touch_synapsys_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.synapsys_conversations
     set updated_at = timezone('utc', now())
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_synapsys_messages_touch_conversation on public.synapsys_conversation_messages;
create trigger trg_synapsys_messages_touch_conversation
after insert on public.synapsys_conversation_messages
for each row
execute function public.touch_synapsys_conversation();

alter table public.synapsys_projects enable row level security;
alter table public.synapsys_conversations enable row level security;
alter table public.synapsys_conversation_messages enable row level security;
alter table public.synapsys_user_settings enable row level security;
alter table public.synapsys_platform_updates enable row level security;

drop policy if exists "synapsys_projects_select_own" on public.synapsys_projects;
create policy "synapsys_projects_select_own"
on public.synapsys_projects
for select
using (auth.uid() = user_id);

drop policy if exists "synapsys_projects_insert_own" on public.synapsys_projects;
create policy "synapsys_projects_insert_own"
on public.synapsys_projects
for insert
with check (auth.uid() = user_id);

drop policy if exists "synapsys_projects_update_own" on public.synapsys_projects;
create policy "synapsys_projects_update_own"
on public.synapsys_projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "synapsys_projects_delete_own" on public.synapsys_projects;
create policy "synapsys_projects_delete_own"
on public.synapsys_projects
for delete
using (auth.uid() = user_id);

drop policy if exists "synapsys_conversations_select_own" on public.synapsys_conversations;
create policy "synapsys_conversations_select_own"
on public.synapsys_conversations
for select
using (auth.uid() = user_id);

drop policy if exists "synapsys_conversations_insert_own" on public.synapsys_conversations;
create policy "synapsys_conversations_insert_own"
on public.synapsys_conversations
for insert
with check (auth.uid() = user_id);

drop policy if exists "synapsys_conversations_update_own" on public.synapsys_conversations;
create policy "synapsys_conversations_update_own"
on public.synapsys_conversations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "synapsys_conversations_delete_own" on public.synapsys_conversations;
create policy "synapsys_conversations_delete_own"
on public.synapsys_conversations
for delete
using (auth.uid() = user_id);

drop policy if exists "synapsys_messages_select_own" on public.synapsys_conversation_messages;
create policy "synapsys_messages_select_own"
on public.synapsys_conversation_messages
for select
using (
  exists (
    select 1
      from public.synapsys_conversations conversation
     where conversation.id = conversation_id
       and conversation.user_id = auth.uid()
  )
);

drop policy if exists "synapsys_messages_insert_own" on public.synapsys_conversation_messages;
create policy "synapsys_messages_insert_own"
on public.synapsys_conversation_messages
for insert
with check (
  exists (
    select 1
      from public.synapsys_conversations conversation
     where conversation.id = conversation_id
       and conversation.user_id = auth.uid()
  )
);

drop policy if exists "synapsys_messages_delete_own" on public.synapsys_conversation_messages;
create policy "synapsys_messages_delete_own"
on public.synapsys_conversation_messages
for delete
using (
  exists (
    select 1
      from public.synapsys_conversations conversation
     where conversation.id = conversation_id
       and conversation.user_id = auth.uid()
  )
);

drop policy if exists "synapsys_user_settings_select_own" on public.synapsys_user_settings;
create policy "synapsys_user_settings_select_own"
on public.synapsys_user_settings
for select
using (auth.uid() = user_id);

drop policy if exists "synapsys_user_settings_insert_own" on public.synapsys_user_settings;
create policy "synapsys_user_settings_insert_own"
on public.synapsys_user_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "synapsys_user_settings_update_own" on public.synapsys_user_settings;
create policy "synapsys_user_settings_update_own"
on public.synapsys_user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "synapsys_platform_updates_read" on public.synapsys_platform_updates;
create policy "synapsys_platform_updates_read"
on public.synapsys_platform_updates
for select
using (true);

insert into public.synapsys_platform_updates (version, title, description, type)
select '5.1.0', 'Base da navegacao persistente', 'Conversas, projetos, busca e cerebros recentes preparados para a nova fase da Synapsys.', 'new'
where not exists (
  select 1
    from public.synapsys_platform_updates
   where version = '5.1.0'
     and title = 'Base da navegacao persistente'
);
