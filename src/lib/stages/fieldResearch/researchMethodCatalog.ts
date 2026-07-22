import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";

export type ResearchMethodCatalogEntry = {
  id: ResearchMethodId;
  label: string;
  /** To-know 표 · 정보 아이콘용 한 줄 설명 */
  summary: string;
};

export const RESEARCH_METHOD_CATALOG: ResearchMethodCatalogEntry[] = [
  {
    id: "desk_research",
    label: "데스크리서치",
    summary:
      "책상에서 자료·통계·사례·경쟁 정보를 모을 때 써요. 시장·정책·업계 맥락을 넓게 파악할 때 적합해요.",
  },
  {
    id: "survey",
    label: "설문",
    summary:
      "많은 사람에게 같은 질문을 보내 패턴을 빠르게 볼 때 써요. 깊이보다 분포·빈도·우선순위 확인에 적합해요.",
  },
  {
    id: "fgd",
    label: "포커스그룹(FGD)",
    summary:
      "소수를 모아 같은 주제로 토론하며 관점을 모을 때 써요. 왜 그렇게 생각하는지 함께 드러나요.",
  },
  {
    id: "home_visit_in_depth",
    label: "홈비짓·인뎁스 인터뷰",
    summary:
      "사용자 공간에서 1:1로 깊게 인터뷰할 때 써요. 맥락·습관·감정을 함께 들을 수 있어요.",
  },
  {
    id: "shadowing",
    label: "섀도잉",
    summary:
      "실제 사용·업무 현장을 따라가며 행동을 관찰할 때 써요. 말과 행동의 차이를 볼 수 있어요.",
  },
  {
    id: "be_the_customer",
    label: "Be the Customer",
    summary:
      "직접 서비스·제품을 써 보며 불편을 체감할 때 써요. 사용자 경험을 몸으로 확인해요.",
  },
  {
    id: "other",
    label: "기타",
    summary:
      "위에 없는 방법(워크숍·협동 관찰 등)을 직접 정할 때 써요. 선택 후 메모에 방법 이름을 적어 두면 좋아요.",
  },
];

/**
 * Design Thinking 공감(Empathize) 단계 현장 리서치 방법.
 * 설문·데스크리서치·FGD 등은 제외 — 사용자 조사 준비(CORE 1) 추천에만 사용.
 */
export const DT_FIELD_RESEARCH_METHOD_IDS = [
  "home_visit_in_depth",
  "shadowing",
  "be_the_customer",
] as const satisfies readonly ResearchMethodId[];

const DT_FIELD_METHOD_SET = new Set<ResearchMethodId>(
  DT_FIELD_RESEARCH_METHOD_IDS,
);

export function isDtFieldResearchMethod(id: ResearchMethodId): boolean {
  return DT_FIELD_METHOD_SET.has(id);
}

export function filterDtFieldResearchMethods(
  ids: ResearchMethodId[],
): ResearchMethodId[] {
  return ids.filter((id) => DT_FIELD_METHOD_SET.has(id));
}

export function getDtFieldResearchCatalog(): ResearchMethodCatalogEntry[] {
  return RESEARCH_METHOD_CATALOG.filter((m) => DT_FIELD_METHOD_SET.has(m.id));
}

/** 발견 정리하기(4단계) 조사 대상 — 선택 불가 리서치 방법 */
const STAGE4_RESEARCH_SYNTHESIS_EXCLUDED = new Set<ResearchMethodId>([
  "desk_research",
  "survey",
  "be_the_customer",
]);

export function isStage4ResearchSynthesisMethod(id: ResearchMethodId): boolean {
  return !STAGE4_RESEARCH_SYNTHESIS_EXCLUDED.has(id);
}

/** 발견 정리하기 — 조사 대상 리서치 방법 드롭다운 옵션 */
export function getStage4ResearchSynthesisCatalog(): ResearchMethodCatalogEntry[] {
  return RESEARCH_METHOD_CATALOG.filter((m) =>
    isStage4ResearchSynthesisMethod(m.id),
  );
}

const BY_ID = new Map(
  RESEARCH_METHOD_CATALOG.map((entry) => [entry.id, entry]),
);

export function getResearchMethodEntry(
  id: ResearchMethodId | "",
): ResearchMethodCatalogEntry | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function getResearchMethodSummary(id: ResearchMethodId | ""): string {
  const entry = getResearchMethodEntry(id);
  if (entry) return entry.summary;
  return "조사 방법을 선택하면 이 아이콘에 간단한 설명이 보여요.";
}

/** 코치 API 컨텍스트용 */
export function formatResearchMethodsForCoach(): string {
  return RESEARCH_METHOD_CATALOG.map(
    (m) => `· ${m.label}: ${m.summary}`,
  ).join("\n");
}

/** To-know 표 — 방법 미지정 그룹 키 */
export const TO_KNOW_UNASSIGNED_METHOD = "__unassigned__" as const;

export function toKnowMethodSectionKey(method: ResearchMethodId | ""): string {
  return method || TO_KNOW_UNASSIGNED_METHOD;
}

export function toKnowMethodSectionLabel(sectionKey: string): string {
  if (sectionKey === TO_KNOW_UNASSIGNED_METHOD) return "방법 미지정";
  const entry = getResearchMethodEntry(sectionKey as ResearchMethodId);
  return entry?.label ?? sectionKey;
}

/** 카탈로그 순서 + 미지정·기타 */
export function orderedToKnowMethodSections(
  presentKeys: Iterable<string>,
): string[] {
  const present = new Set(presentKeys);
  const ordered: string[] = RESEARCH_METHOD_CATALOG.map((m) => m.id).filter(
    (id) => present.has(id),
  );
  if (present.has(TO_KNOW_UNASSIGNED_METHOD)) {
    ordered.push(TO_KNOW_UNASSIGNED_METHOD);
  }
  for (const key of present) {
    if (!ordered.includes(key)) ordered.push(key);
  }
  return ordered;
}
