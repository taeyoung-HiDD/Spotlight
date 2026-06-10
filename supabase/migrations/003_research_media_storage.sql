-- 단계 4 · 조사 대상 리서치 미디어 (사진·영상·음성)
insert into storage.buckets (id, name, public, file_size_limit)
values ('research-media', 'research-media', false, 52428800)
on conflict (id) do nothing;

create or replace function public.user_can_access_research_media(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(object_name))[1]
      and (
        p.user_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  );
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
