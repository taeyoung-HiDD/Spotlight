import { formatAnswerList } from "@/lib/stages/stage2/contextualAnswers";

/** 맥락 이해하기 — 1단계 문제점 기준 조사 항목 */

export type ContextualDimensionId =
  | "primary_users"
  | "stakeholders"
  | "situation"
  | "environment"
  | "competitors"
  | "products_services"
  | "policy"
  | "infrastructure";

export type ContextualDiscoveryStep = ContextualDimensionId | "confirm" | "done";

export type ContextualDimensionAnswers = Partial<
  Record<ContextualDimensionId, string[]>
>;

export interface ContextualDimensionDef {
  id: ContextualDimensionId;
  order: number;
  label: string;
  shortLabel: string;
  coachLead: string;
  inputHint: string;
  placeholder: string;
}

export const CONTEXTUAL_DIMENSIONS: ContextualDimensionDef[] = [
  {
    id: "primary_users",
    order: 1,
    label: "주 사용자",
    shortLabel: "주 사용자",
    coachLead:
      "먼저 주 사용자를 짚어 볼게요. 문제를 직접 겪는 사람이 누구인지(세그먼트·역할)부터 정의해 볼게요.",
    inputHint:
      "누구인지·어떤 특성·행태를 가지는지 짧게 적어 주세요. 예시 칩을 누르면 입력란에 추가돼요.",
    placeholder: "예: 20대 대학생, 오피스 직장인, 동네 주부…",
  },
  {
    id: "stakeholders",
    order: 2,
    label: "이해 관계자",
    shortLabel: "이해 관계자",
    coachLead:
      "이번엔 이해 관계자예요. 운영·중개·공급·규제 쪽 주체를 생각해 볼게요. 주 사용자(손님·이용자)는 넣지 않아요.",
    inputHint: "사장·직원·공급사·플랫폼 담당 등 역할·조직을 적어 주세요.",
    placeholder: "예: 카페 사장, 바리스타, 원두 공급사…",
  },
  {
    id: "situation",
    order: 3,
    label: "상황·맥락",
    shortLabel: "상황",
    coachLead:
      "주 사용자와 이해 관계자가 문제를 겪거나 다루는 상황은 어떤가요?",
    inputHint: "상황을 여러 개 적어 주세요.",
    placeholder: "예: 출근 전 아침, 점심시간, 주말 브런치…",
  },
  {
    id: "environment",
    order: 4,
    label: "주변 환경",
    shortLabel: "주변 환경",
    coachLead: "그들이 놓인 주변 환경·분위기·제약은 어떤가요?",
    inputHint: "환경 요인을 여러 개 적어 주세요.",
    placeholder: "예: 번화가, 오피스 밀집, 배달 앱 문화…",
  },
  {
    id: "competitors",
    order: 5,
    label: "경쟁·대안",
    shortLabel: "경쟁자",
    coachLead: "비슷한 문제를 다루거나 고객 선택을 나누는 경쟁·대안은 무엇인가요?",
    inputHint: "경쟁·대안을 여러 개 적어 주세요.",
    placeholder: "예: 프랜차이즈 카페, 커피 앱, 편의점…",
  },
  {
    id: "products_services",
    order: 6,
    label: "연관 제품·서비스",
    shortLabel: "제품·서비스",
    coachLead: "문제와 연관된 제품·서비스·도구는 무엇이 있나요?",
    inputHint: "제품·서비스·도구를 여러 개 적어 주세요.",
    placeholder: "예: 지도 앱, 리뷰 사이트, 예약 앱…",
  },
  {
    id: "policy",
    order: 7,
    label: "정책·규제",
    shortLabel: "정책",
    coachLead: "영향을 줄 수 있는 정책·규제·가이드가 있나요?",
    inputHint: "해당 항목을 여러 개 적어 주세요. 없으면 「특별히 없음」도 돼요.",
    placeholder: "예: 영업시간 규제, 위생 기준, 플랫폼 수수료…",
  },
  {
    id: "infrastructure",
    order: 8,
    label: "인프라",
    shortLabel: "인프라",
    coachLead: "마지막으로 인프라·기술·물류 기반은 어떤가요?",
    inputHint: "인프라·기술 요소를 여러 개 적어 주세요.",
    placeholder: "예: 와이파이, 키오스크, 배달 인프라…",
  },
];

export function isContextualDimensionStep(
  step: string,
): step is ContextualDimensionId {
  return CONTEXTUAL_DIMENSIONS.some((d) => d.id === step);
}

export function getDimensionDef(
  id: ContextualDimensionId,
): ContextualDimensionDef {
  const found = CONTEXTUAL_DIMENSIONS.find((d) => d.id === id);
  if (!found) return CONTEXTUAL_DIMENSIONS[0];
  return found;
}

export function nextDimensionStep(
  current: ContextualDimensionId,
): ContextualDimensionId | null {
  const idx = CONTEXTUAL_DIMENSIONS.findIndex((d) => d.id === current);
  if (idx < 0 || idx >= CONTEXTUAL_DIMENSIONS.length - 1) return null;
  return CONTEXTUAL_DIMENSIONS[idx + 1].id;
}

export function prevDimensionStep(
  current: ContextualDimensionId,
): ContextualDimensionId | null {
  const idx = CONTEXTUAL_DIMENSIONS.findIndex((d) => d.id === current);
  if (idx <= 0) return null;
  return CONTEXTUAL_DIMENSIONS[idx - 1].id;
}

export function firstDimensionStep(): ContextualDimensionId {
  return CONTEXTUAL_DIMENSIONS[0].id;
}

export function dimensionProgressLabel(step: ContextualDiscoveryStep): string {
  if (step === "confirm") return "마지막 확인";
  if (step === "done") return "완료";
  const def = getDimensionDef(step);
  return `${def.order}/${CONTEXTUAL_DIMENSIONS.length} · ${def.shortLabel}`;
}

function isCafeLikeProblem(problem: string): boolean {
  return /(카페|커피|음료|매장|손님)/.test(problem);
}

/** 문제 문장에 맞춘 예시 (코치·입력 가이드) */
export function examplesForDimension(
  problem: string,
  id: ContextualDimensionId,
): string[] {
  const cafe = isCafeLikeProblem(problem);
  switch (id) {
    case "primary_users":
      return cafe
        ? ["학생", "직장인", "주부", "관광객"]
        : ["문제를 직접 겪는 사람", "초보 사용자", "숙련 사용자"];
    case "stakeholders":
      return cafe
        ? ["카페 사장", "아르바이트", "매니저", "원두·장비 공급사"]
        : ["운영 담당", "파트너", "내부 의사결정자"];
    case "situation":
      return cafe
        ? ["출근 전 아침", "점심시간 대기", "주말 브런치", "회의 전 픽업"]
        : ["업무 중", "이동 중", "첫 사용 직후"];
    case "environment":
      return cafe
        ? ["오피스 밀집 상권", "대학가", "배달·테이크아웃 비중 큰 동네"]
        : ["온라인 위주", "오프라인 매장", "규제가 큰 업종"];
    case "competitors":
      return cafe
        ? ["프랜차이즈 카페", "개인 카페", "편의점 커피", "배달 전문"]
        : ["직접 경쟁 서비스", "자체 해결(수기)", "대체 습관"];
    case "products_services":
      return cafe
        ? ["지도·리뷰 앱", "멤버십 앱", "예약·줄서기 앱"]
        : ["이미 쓰는 도구", "비교 사이트", "커뮤니티"];
    case "policy":
      return cafe
        ? ["영업시간·소음 규제", "위생·원산지 표시", "플랫폼 수수료"]
        : ["개인정보", "업종 규제", "특별히 없음"];
    case "infrastructure":
      return cafe
        ? ["매장 Wi‑Fi", "키오스크·POS", "배달 플랫폼 연동"]
        : ["결제·로그인", "클라우드", "오프라인 시설"];
    default:
      return [];
  }
}

export function buildDimensionQuestion(
  id: ContextualDimensionId,
  problem: string,
  answers: ContextualDimensionAnswers,
): string {
  const def = getDimensionDef(id);
  const examples = examplesForDimension(problem, id);
  const exampleLine =
    examples.length > 0
      ? `\n\n예를 들면 ${examples.slice(0, 4).join(", ")} 같은 후보가 있을 수 있어요.`
      : "";

  const prior =
    id === "stakeholders" && answers.primary_users?.length
      ? `\n\n앞에서 주 사용자는 ${formatAnswerList(answers.primary_users)}(으)로 이해했어요.`
      : id === "situation" &&
          (answers.primary_users?.length || answers.stakeholders?.length)
        ? `\n\n지금까지 ${[
            answers.primary_users?.length &&
              `주 사용자: ${formatAnswerList(answers.primary_users)}`,
            answers.stakeholders?.length &&
              `이해 관계자: ${formatAnswerList(answers.stakeholders)}`,
          ]
            .filter(Boolean)
            .join(" · ")}(이)라고 정리했어요.`
        : "";

  return `${def.coachLead}${prior}${exampleLine}\n\n${def.inputHint}`;
}
