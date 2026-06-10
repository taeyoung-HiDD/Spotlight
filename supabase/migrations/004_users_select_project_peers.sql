-- 같은 프로젝트 팀원의 display_name · avatar_url 조회 (허브 썸네일)

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
