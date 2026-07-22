-- 단계 4 · 조사 대상 리서치 미디어 (사진·영상·음성)
-- project_members 없이도 동작: 프로젝트 소유자(projects.user_id)만 접근

insert into storage.buckets (id, name, public, file_size_limit)
values ('research-media', 'research-media', false, 52428800)
on conflict (id) do nothing;

create or replace function public.user_can_access_research_media(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  project_id_text text;
begin
  project_id_text := (storage.foldername(object_name))[1];
  if project_id_text is null or project_id_text = '' then
    return false;
  end if;

  -- 소유자
  if exists (
    select 1
    from public.projects p
    where p.id::text = project_id_text
      and p.user_id = auth.uid()
  ) then
    return true;
  end if;

  -- 팀 멤버 테이블이 있을 때만 멤버 접근 허용
  if to_regclass('public.project_members') is not null then
    return exists (
      select 1
      from public.project_members pm
      where pm.project_id::text = project_id_text
        and pm.user_id = auth.uid()
    );
  end if;

  return false;
end;
$$;

drop policy if exists research_media_select on storage.objects;
drop policy if exists research_media_insert on storage.objects;
drop policy if exists research_media_delete on storage.objects;

create policy research_media_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'research-media'
  and public.user_can_access_research_media(name)
);

create policy research_media_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'research-media'
  and public.user_can_access_research_media(name)
);

create policy research_media_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'research-media'
  and public.user_can_access_research_media(name)
);
