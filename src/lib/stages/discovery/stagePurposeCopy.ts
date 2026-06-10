import { STAGE_META } from "@/lib/stages/constants";

export type StagePurposeCopy = {
  label: string;
  purpose: string;
  workCaption: string;
  placeholderLines: [string, string];
};

const STAGE_PURPOSE: Partial<Record<number, StagePurposeCopy>> = {
  2: {
    label: "맥락 이해하기를 하는 이유",
    purpose:
      "현장 리서치 전 사전 리서치 4단계 가이드(시장·유사 사례·대상자 프로필·관련 대상자)에 맞춰 맥락을 파악하고, 효율적인 현장 조사를 준비하는 단계예요.",
    workCaption: "맥락 이해하기 — 사전 리서치 (Contextual Research)",
    placeholderLines: [
      "왼쪽 가이드와 예시를 먼저 읽어 보세요.",
      "코치 안내가 끝나면 궁금한 점을 물어보고 「다음으로 이동」을 눌러 주세요.",
    ],
  },
  3: {
    label: "To-know list를 만드는 이유",
    purpose:
      "제안한 문제를 더 깊고 정확하게 파기 위해, 조사 전에 무엇을·누구에게·어떤 방법으로 확인할지 질문 목록을 만드는 단계예요.",
    workCaption: "사용자 조사 준비하기 — 조사 질문 목록",
    placeholderLines: [
      "1·2단계 문제점과 사전 조사 항목을 바탕으로 CREMA v5 To-know 표가 채워져요.",
      "주제별 To-know 질문과 조사 방법을 확인·수정한 뒤 다음 단계로 이어가세요.",
    ],
  },
  4: {
    label: "발견을 정리하는 이유",
    purpose:
      "사용자 조사에서 들은 말과 본 행동을 한곳에 모아, 다음 니즈·아이디어 단계로 넘길 인사이트를 뽑는 자리예요.",
    workCaption: "공감맵 · 데이터 정리",
    placeholderLines: [
      "공감맵을 채운 뒤 데이터 정리로 넘어가요.",
      "조사 대상별 언급·관찰은 가져오기로 채우고, 발견한 것은 조사자 인사이트를 직접 적어요.",
    ],
  },
  5: {
    label: "진짜 필요를 찾는 이유",
    purpose:
      "4단계에서 모은 언급·관찰을 한 보드에서 보고, 조사 대상마다 말 아래에 있을 수 있는 잠재 니즈를 정리해요. 아직 결론이 아니에요.",
    workCaption: "니즈 분석하기",
    placeholderLines: [
      "4단계 데이터 정리 내용이 한 보드에 모여요.",
      "Kevin이 잠재 니즈 초안을 채워 두면, 이니셜로 누구 자료인지 구분하며 다듬어 보세요.",
    ],
  },
  6: {
    label: "사용자 여정 지도를 그리는 이유",
    purpose:
      "조사 대상(페르소나)마다 사용자 행동 단계를 펼치고, 언급·관찰·잠재 니즈를 배치해 어느 구간에 니즈가 몰려 있는지 한눈에 보는 단계예요.",
    workCaption: "사용자 여정 지도 그리기 (User Journey Map)",
    placeholderLines: [
      "페르소나 탭을 선택하면 해당 조사 대상의 여정이 열려요.",
      "각 여정 단계에 드래그해 배치해 보세요.",
    ],
  },
  7: {
    label: "아이디어를 펼치는 이유",
    purpose:
      "여정 지도에서 니즈가 몰린 단계를 바탕으로, 해결 방향을 여러 갈래로 펼쳐 보는 단계예요. 아직 하나로 고르지 않아요.",
    workCaption: "아이디에이션",
    placeholderLines: [
      "Kevin과 방향을 맞춘 뒤,",
      "왼쪽에 아이디어 초안이 채워질 예정이에요.",
    ],
  },
  8: {
    label: "실행 순서를 정하는 이유",
    purpose:
      "나온 아이디어 중 무엇부터 시도할지, 팀이 합의할 수 있게 우선순위를 잡는 단계예요.",
    workCaption: "우선순위 · 로드맵",
    placeholderLines: [
      "Kevin과 기준을 맞춘 뒤,",
      "왼쪽에 순서 초안이 채워질 예정이에요.",
    ],
  },
  9: {
    label: "컨셉 시트를 만드는 이유",
    purpose:
      "선택한 방향을 한 장으로 정리하고, AI 스토리보드 5컷으로 사용 흐름을 시각화해 다음 시제품 단계의 출발점을 만드는 자리예요.",
    workCaption: "컨셉 시트 + AI 스토리보드",
    placeholderLines: [
      "4 필드를 채운 뒤 스토리보드 문장을 적고,",
      "「AI 스토리보드 생성」으로 5컷 일러스트를 만들어 보세요.",
    ],
  },
  10: {
    label: "시제품을 만드는 이유",
    purpose:
      "컨셉·스토리보드를 실제 화면처럼 보이는 UI 목업으로 옮겨, 사용자 테스트 전에 팀이 같은 경험을 상상하게 해요.",
    workCaption: "시제품 만들기",
    placeholderLines: [
      "Mobile/Web을 고른 뒤 AI 시제품을 생성하고,",
      "미리보기에서 스토리보드 흐름이 살아 있는지 확인해 보세요.",
    ],
  },
};

export function getStagePurposeCopy(stageNumber: number): StagePurposeCopy {
  const custom = STAGE_PURPOSE[stageNumber];
  if (custom) return custom;
  const meta = STAGE_META[stageNumber];
  const title = meta?.title ?? `단계 ${stageNumber}`;
  return {
    label: `${title} — 목적`,
    purpose: `${title} 단계에서 할 일을 Kevin과 먼저 맞춘 뒤, 왼쪽 작업 영역에 초안을 채우고 다듬어 가요.`,
    workCaption: title,
    placeholderLines: [
      "목적과 진행은 오른쪽 Kevin 안내를 참고해 주세요.",
      "대화가 끝나면 작업 초안이 여기 채워져요.",
    ],
  };
}
