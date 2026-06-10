import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import type { IcebergModelData } from "@/lib/stages/iceberg/types";
import { CONTEXTUAL_DIMENSIONS } from "@/lib/stages/stage2/contextualDimensions";
import type { EmpathyMapData } from "@/lib/stages/stage2/empathyMap";

type Stage1Snapshot = {
  displayName?: string;
  userLevel?: "beginner" | "expert";
  projectTitle?: string;
  startingPoint: string;
  hope: string;
  fear: string;
  principleAck: boolean;
};

function clip(text: string, max = 200): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function summarizeStage1Artifact(s: Stage1Snapshot): string {
  const lines: string[] = [];
  if (s.displayName?.trim()) {
    lines.push(
      `코칭 대상(서비스 이용자·창업자) 호칭: ${s.displayName.trim()}님 — 공감맵 페르소나 이름이 아님`,
    );
  }
  if (s.userLevel) {
    lines.push(
      s.userLevel === "expert"
        ? "코칭 맞춤: 핵심 점검 톤, 예시는 요청 시, 모든 단계 권장"
        : "코칭 맞춤: 차근차근 단계별 안내, 예시 충분히 제공, 모든 단계 권장",
    );
  }
  if (s.projectTitle?.trim()) {
    lines.push(`프로젝트 이름: ${clip(s.projectTitle)}`);
  }
  if (s.startingPoint.trim()) lines.push(`문제점: ${clip(s.startingPoint)}`);
  if (s.hope.trim()) lines.push(`Hopes: ${clip(s.hope)}`);
  if (s.fear.trim()) lines.push(`Fears: ${clip(s.fear)}`);
  lines.push(`원칙 동의: ${s.principleAck ? "완료" : "미완료"}`);
  return lines.join("\n");
}

export function summarizeStage2EmpathyMap(data: EmpathyMapData): string {
  const lines: string[] = [];
  for (const d of CONTEXTUAL_DIMENSIONS) {
    const items = data.contextualPrep.answers[d.id];
    if (items?.length) {
      lines.push(`${d.label}: ${clip(items.join(", "), 80)}`);
    }
  }
  if (data.contextualInsights.trim()) {
    lines.push(`사전 조사 메모: ${clip(data.contextualInsights, 260)}`);
  }
  const researched = CONTEXTUAL_DIMENSIONS.filter(
    (d) => data.contextualDimensionResearch?.[d.id]?.status === "done",
  ).length;
  if (researched > 0) {
    lines.push(`항목별 조사 완료: ${researched}/${CONTEXTUAL_DIMENSIONS.length}`);
  }
  if (data.toKnowUnknowns.length) {
    lines.push(
      `미확인 항목(${data.toKnowUnknowns.length}): ${data.toKnowUnknowns
        .slice(0, 6)
        .map((u) => clip(u, 42))
        .join(" | ")}${data.toKnowUnknowns.length > 6 ? " | …" : ""}`,
    );
  }
  return lines.length > 0 ? lines.join("\n") : "(맥락 이해 자료 없음)";
}

/** 단계 2 채팅 — 맥락 이해하기 산출물 */
export function buildStage2ChatArtifactSummary(
  empathy: EmpathyMapData,
  coachUserCallName?: string,
): string {
  const lines: string[] = [];
  const call = coachUserCallName?.trim();
  if (call) {
    lines.push(
      `[코칭 대상 호칭] ${call}님 — 지금 대화하는 창업자(서비스 이용자)를 이 호칭으로 부르세요.`,
    );
  }
  const summary = summarizeStage2EmpathyMap(empathy);
  if (summary.trim()) {
    lines.push("", "[맥락 이해하기]", summary);
  }
  lines.push(
    "",
    "[코치 행동]",
    "- 이 단계는 공감맵·페르소나 이름 수집이 아니라, 문제 맥락 사전 조사와 To-know 미확인 항목 정리에 집중하세요.",
    "- 고객·페르소나 이름을 새로 묻거나 공감맵 네 칸을 채우라고 안내하지 마세요.",
  );
  return lines.join("\n");
}

export function summarizeStage3Artifact(data: FieldResearchData): string {
  const lines: string[] = [];
  if (data.toKnowTable?.length) {
    const filled = data.toKnowTable.filter((r) => r.small.trim());
    lines.push(`To-know(Table): ${filled.length}/${data.toKnowTable.length} 작성`);
    const sample = filled
      .slice(0, 4)
      .map((r) => `${r.big}/${clip(r.mid, 20)}: ${clip(r.small, 44)}`)
      .join(" | ");
    if (sample) lines.push(`- 예시: ${sample}${filled.length > 4 ? " | …" : ""}`);
  }
  if (data.researchMethods?.length) {
    lines.push(
      `조사 계획(${data.researchMethods.length}): ${data.researchMethods
        .slice(0, 6)
        .map((m) => clip(m.label, 44))
        .join(" | ")}${data.researchMethods.length > 6 ? " | …" : ""}`,
    );
  }
  if (data.researchProtocol?.trim()) {
    lines.push(`프로토콜: ${clip(data.researchProtocol, 140)}`);
  }
  lines.push(`사전 준비 확인: ${data.prepConfirmed ? "예" : "아니오"}`);
  lines.push(`전체 동의 확인: ${data.allConsentConfirmed ? "예" : "아니오"}`);
  for (const r of data.respondents) {
    const session = data.sessions[r.id];
    const logCount = session?.logEntries.length ?? 0;
    lines.push(
      `- ${r.shortLabel || r.name}: 모집 ${r.recruitStatus}, 동의 ${r.consentReceived ? "Y" : "N"}, 로그 ${logCount}건`,
    );
    if (session?.debriefing.surprise.trim()) {
      lines.push(`  디브리핑(놀라움): ${clip(session.debriefing.surprise, 100)}`);
    }
  }
  return lines.join("\n");
}

export function summarizeStage5Artifact(data: IcebergModelData): string {
  const lines: string[] = [];
  if (data.explicit.items.length) {
    lines.push(`1층(말한 것): ${data.explicit.items.map((i) => clip(i, 60)).join(", ")}`);
  }
  if (data.tacit.items.length) {
    lines.push(`2층(행동): ${data.tacit.items.map((i) => clip(i, 60)).join(", ")}`);
  }
  const { latent } = data;
  if (latent.headline.trim() || latent.quote.trim()) {
    lines.push(
      `3층(잠재): ${clip(latent.headline)} / 인용: ${clip(latent.quote, 80)}`,
    );
  }
  if (data.decision) lines.push(`결정: ${data.decision}`);
  return lines.length > 0 ? lines.join("\n") : "(단계 5 슬롯 비어 있음)";
}
