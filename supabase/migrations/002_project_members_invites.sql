-- 프로젝트 팀 · 초대 (단계 1 Hopes/Fears부터 협업)

do $$ begin
  create type public.project_member_role as enum ('owner', 'member');
exception when duplicate_object then null;
end $$;

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.project_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_id_idx
  on public.project_members (user_id);

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  invited_by uuid not null references public.users (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  accepted_by uuid references public.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists project_invites_project_id_idx
  on public.project_invites (project_id);
create index if not exists project_invites_token_idx
  on public.project_invites (token);

-- 기존 프로젝트 소유자 → members 백필
insert into public.project_members (project_id, user_id, role)
select id, user_id, 'owner'::public.project_member_role
from public.projects
on conflict (project_id, user_id) do nothing;

create or replace function public.user_can_access_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members m
    where m.project_id = pid and m.user_id = auth.uid()
  );
$$;

create or replace function public.user_owns_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and p.user_id = auth.uid()
  );
$$;

create or replace function public.add_project_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.user_id, 'owner')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists projects_add_owner_member on public.projects;
create trigger projects_add_owner_member
  after insert on public.projects
  for each row execute function public.add_project_owner_member();

alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;

drop policy if exists "project_members_select" on public.project_members;
create policy "project_members_select"
  on public.project_members for select
  using (public.user_can_access_project(project_id));

drop policy if exists "project_members_insert_owner" on public.project_members;
create policy "project_members_insert_owner"
  on public.project_members for insert
  with check (auth.uid() = user_id and public.user_owns_project(project_id));

drop policy if exists "projects_select_member" on public.projects;
drop policy if exists "projects_all_own" on public.projects;

create policy "projects_select_member"
  on public.projects for select
  using (public.user_can_access_project(id));

create policy "projects_insert_own"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "projects_update_own"
  on public.projects for update
  using (public.user_owns_project(id))
  with check (public.user_owns_project(id));

create policy "projects_delete_own"
  on public.projects for delete
  using (public.user_owns_project(id));

drop policy if exists "artifacts_all_via_project" on public.artifacts;
create policy "artifacts_all_via_project"
  on public.artifacts for all
  using (public.user_can_access_project(project_id))
  with check (public.user_can_access_project(project_id));

drop policy if exists "project_invites_select_owner" on public.project_invites;
create policy "project_invites_select_owner"
  on public.project_invites for select
  using (public.user_owns_project(project_id));

drop policy if exists "project_invites_insert_owner" on public.project_invites;
create policy "project_invites_insert_owner"
  on public.project_invites for insert
  with check (
    public.user_owns_project(project_id)
    and auth.uid() = invited_by
  );

drop policy if exists "project_invites_update_owner" on public.project_invites;
create policy "project_invites_update_owner"
  on public.project_invites for update
  using (public.user_owns_project(project_id));

create or replace function public.get_invite_preview(invite_token text)
returns table (
  project_id uuid,
  project_title text,
  starting_point text,
  inviter_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.project_invites%rowtype;
  sp text;
begin
  select * into inv
  from public.project_invites
  where token = invite_token
    and status = 'pending'
    and expires_at > now();

  if not found then
    return;
  end if;

  select coalesce(
    (a.slots -> 'stage1_collect' -> 'content' ->> 'startingPoint'),
    p.title
  )
  into sp
  from public.projects p
  left join public.artifacts a
    on a.project_id = p.id and a.stage_id = 1 and a.artifact_type = 'form'
  where p.id = inv.project_id
  limit 1;

  return query
  select
    inv.project_id,
    p.title,
    coalesce(nullif(trim(sp), ''), p.title),
    coalesce(u.display_name, split_part(u.email, '@', 1), 'Kevin 코치 사용자')
  from public.projects p
  join public.users u on u.id = inv.invited_by
  where p.id = inv.project_id;
end;
$$;

grant execute on function public.get_invite_preview(text) to authenticated;

create or replace function public.accept_project_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.project_invites%rowtype;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into inv
  from public.project_invites
  where token = invite_token
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invite_invalid';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (inv.project_id, uid, 'member')
  on conflict (project_id, user_id) do nothing;

  update public.project_invites
  set status = 'accepted', accepted_by = uid, accepted_at = now()
  where id = inv.id;

  return inv.project_id;
end;
$$;

grant execute on function public.accept_project_invite(text) to authenticated;
