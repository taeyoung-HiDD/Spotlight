import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import type { EmpathyMapData } from "@/lib/stages/stage2/empathyMap";

export interface Stage2BaselineContext {
  startingPoint: string;
  coachUserCallName: string;
}

export function isEmpathyPersonaDiscoveryActive(data: EmpathyMapData): boolean {
  if (data.personaQnaComplete) return false;
  const hasQuadrants = Object.values(data.quadrants).some((q) => q.length > 0);
  return !hasQuadrants;
}

export function resolvePersonaQnaFromLoad(
  raw: unknown,
  data: Pick<EmpathyMapData, "personaName" | "personaSituationRaw" | "quadrants">,
): boolean {
  const hasQuadrants = Object.values(data.quadrants).some((q) => q.length > 0);
  if (hasQuadrants) return true;
  if (typeof raw === "boolean") return raw;
  return false;
}

export function getEmpathyPurposeExplanation(
  baseline: Stage2BaselineContext,
): string {
  const problem = baseline.startingPoint.trim();
  const lead = problem
    ? `1단계에서 적어 두신 문제를 「${problem.slice(0, 72)}${problem.length > 72 ? "…" : ""}」 바탕으로`
    : "지금까지 정리한 문제를 바탕으로";

  const call = baseline.coachUserCallName.trim();
  const you = call ? `${call}님과` : "함께";

  return formatCoachDialogBreaks(
    `${lead}, ${you} 리서치할 고객 한 명의 공감맵을 그릴 거예요.

가운데는 회원님 본인이 아니라 그 고객·페르소나예요. Kevin과 이름·상황을 먼저 맞춘 뒤, Says·Thinks·Does·Feels 네 칸을 채워요.`,
  );
}

export function buildEmpathyDiscoveryKickoff(): string[] {
  return [
    formatCoachDialogBreaks(
      "가운데에 둘 고객·페르소나의 이름과 상황을 Kevin에게 말해 주세요. 상황은 길게 말해도 괜찮아요 — 가운데는 짧게 요약되고 썸네일은 자동으로 붙어요.",
    ),
    formatCoachDialogBreaks(
      "이해가 되면 한 번 더 짧게 이야기해 주시면, 그때부터 왼쪽 네 칸에 포스트잇을 붙일 수 있어요.",
    ),
  ];
}
