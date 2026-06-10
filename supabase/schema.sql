-- =============================================================================
-- Spotlight — Supabase SQL Editor용 스키마 (PRD §6.1)
-- Dashboard → SQL Editor: 파일 내용 전체 복사·붙여넣기 후 Run
-- 이미 일부가 만들어진 뒤에도 다시 실행 가능 (idempotent)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMs (§6.1) — 이미 있으면 건너뜀
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.confidence_level as enum ('discovery', 'hypothesis');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.slot_state as enum (
    'empty', 'in_progress', 'complete', 'revisit', 'frozen'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.slot_updated_by as enum ('user', 'ai_coach');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.artifact_type as enum (
    'form', 'ladder', 'matrix', 'sheet', 'slide',
    'external_program', 'application_prep'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.project_status as enum ('active', 'archived', 'completed');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- users (Auth 연동 프로필)
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  status public.project_status not null default 'active',
  current_phase text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);

-- -----------------------------------------------------------------------------
-- artifacts (PRD §6.1)
-- -----------------------------------------------------------------------------
create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  artifact_type public.artifact_type not null,
  stage_id smallint not null check (stage_id between 1 and 15),
  slots jsonb not null default '{}'::jsonb,
  hypothesis_board boolean not null default false,
  image_attachments text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artifacts_slots_is_object check (jsonb_typeof(slots) = 'object')
);

create index if not exists artifacts_project_id_idx on public.artifacts (project_id);
create index if not exists artifacts_artifact_type_idx on public.artifacts (artifact_type);
create index if not exists artifacts_stage_id_idx on public.artifacts (stage_id);
create index if not exists artifacts_hypothesis_board_idx on public.artifacts (hypothesis_board)
  where hypothesis_board = true;
create index if not exists artifacts_slots_gin_idx on public.artifacts using gin (slots);

-- -----------------------------------------------------------------------------
-- updated_at 자동 갱신
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists artifacts_set_updated_at on public.artifacts;
create trigger artifacts_set_updated_at
  before update on public.artifacts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.artifacts enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select using (auth.uid() = id);

drop policy if exists "users_select_project_peers" on public.users;
create policy "users_select_project_peers"
  on public.users for select
  using (
    exists (
      select 1
      from public.project_members mine
      join public.project_members peer
        on mine.project_id = peer.project_id
      where mine.user_id = auth.uid()
        and peer.user_id = users.id
    )
  );

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users for insert with check (auth.uid() = id);

drop policy if exists "projects_all_own" on public.projects;
create policy "projects_all_own"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "artifacts_all_via_project" on public.artifacts;
create policy "artifacts_all_via_project"
  on public.artifacts for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = artifacts.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = artifacts.project_id and p.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Auth 가입 시 public.users 자동 생성
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.email), ''),
      (new.id::text || '@anon.spotlight.local')
    ),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
