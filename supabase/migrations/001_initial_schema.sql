-- =============================================================================
-- Spotlight — Supabase SQL Editor용 스키마 (PRD §6.1 Artifact 데이터 모델)
-- Dashboard → SQL → New query 에 붙여넣고 Run
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMs (§6.1)
-- -----------------------------------------------------------------------------
create type public.confidence_level as enum ('discovery', 'hypothesis');
-- discovery: 실제 오프라인 리서치 데이터 연동됨
-- hypothesis: AI가 공백을 추론하여 메웠거나 사용자 단순 가설 상태

create type public.slot_state as enum (
  'empty',
  'in_progress',
  'complete',
  'revisit',
  'frozen'
);

create type public.slot_updated_by as enum ('user', 'ai_coach');

create type public.artifact_type as enum (
  'form',
  'ladder',
  'matrix',
  'sheet',
  'slide',
  'external_program',
  'application_prep'
);

create type public.project_status as enum ('active', 'archived', 'completed');

-- -----------------------------------------------------------------------------
-- users (Auth 연동 프로필)
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_email_idx on public.users (email);

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  status public.project_status not null default 'active',
  current_phase text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

-- -----------------------------------------------------------------------------
-- artifacts (PRD §6.1)
--
-- slots JSONB 구조 (slot_id 키):
-- {
--   "session_logs": {
--     "state": "in_progress",
--     "content": { ... },
--     "confidence": "discovery" | "hypothesis",
--     "source_refs": ["ref_001", ...],
--     "updated_by": "user" | "ai_coach",
--     "updated_at": "2026-05-26T12:00:00.000Z"
--   }
-- }
-- hypothesis_board: 오프라인 리서치 데이터 누락 시 true 고정
-- -----------------------------------------------------------------------------
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  artifact_type public.artifact_type not null,
  stage_id smallint not null check (stage_id between 1 and 14),
  slots jsonb not null default '{}'::jsonb,
  hypothesis_board boolean not null default false,
  image_attachments text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artifacts_slots_is_object check (jsonb_typeof(slots) = 'object')
);

create index artifacts_project_id_idx on public.artifacts (project_id);
create index artifacts_artifact_type_idx on public.artifacts (artifact_type);
create index artifacts_stage_id_idx on public.artifacts (stage_id);
create index artifacts_hypothesis_board_idx on public.artifacts (hypothesis_board)
  where hypothesis_board = true;
create index artifacts_slots_gin_idx on public.artifacts using gin (slots);

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

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger artifacts_set_updated_at
  before update on public.artifacts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.artifacts enable row level security;

create policy "users_select_own"
  on public.users for select using (auth.uid() = id);

create policy "users_update_own"
  on public.users for update using (auth.uid() = id);

create policy "users_insert_own"
  on public.users for insert with check (auth.uid() = id);

create policy "projects_all_own"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
