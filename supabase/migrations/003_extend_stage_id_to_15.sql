-- 단계 6 사용자 여정 지도 추가에 따른 stage_id 상한 확장 (14 → 15)
alter table public.artifacts
  drop constraint if exists artifacts_stage_id_check;

alter table public.artifacts
  add constraint artifacts_stage_id_check
  check (stage_id between 1 and 15);
