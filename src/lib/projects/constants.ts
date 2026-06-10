export type EntryPointId = "A" | "B" | "C";

export interface EntryPointMeta {
  id: EntryPointId;
  tag: string;
  tagFeatured?: boolean;
  title: string;
  description: string;
  footer: string;
  startStage: number;
  currentPhase: string;
  defaultProjectTitle: string;
  projectDescription: string;
}

export const ENTRY_POINTS: EntryPointMeta[] = [
  {
    id: "A",
    tag: "A · 가장 많이",
    tagFeatured: true,
    title: "처음부터 차근차근",
    description: "아이디어 출발점부터 디자인씽킹 14 단계 전체 흐름을 따라갑니다",
    footer: "14 단계 · 코치와 함께",
    startStage: 1,
    currentPhase: "entry_a_full",
    defaultProjectTitle: "새 프로젝트",
    projectDescription: "진입점 A · 처음부터 차근차근 (단계 1부터)",
  },
  {
    id: "B",
    tag: "B",
    title: "아이디어 가진 채로",
    description: "아이디어가 이미 있고 사용자 검증과 구체화부터 시작합니다",
    footer: "단계 2부터 시작",
    startStage: 2,
    currentPhase: "entry_b_idea",
    defaultProjectTitle: "새 프로젝트",
    projectDescription: "진입점 B · 아이디어 가진 채로 (단계 2부터)",
  },
  {
    id: "C",
    tag: "C",
    title: "프로토타입 빨리",
    description: "컨셉이 정해진 상태에서 시제품·피치 덱·지원사업까지",
    footer: "단계 9부터 시작",
    startStage: 9,
    currentPhase: "entry_c_prototype",
    defaultProjectTitle: "새 프로젝트",
    projectDescription: "진입점 C · 프로토타입 빨리 (단계 9부터)",
  },
];

export function getEntryPointMeta(id: EntryPointId): EntryPointMeta {
  const meta = ENTRY_POINTS.find((entry) => entry.id === id);
  if (!meta) throw new Error(`Unknown entry point: ${id}`);
  return meta;
}
