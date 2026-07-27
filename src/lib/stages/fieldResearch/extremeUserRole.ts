import type { RespondentRole } from "@/lib/stages/fieldResearch/types";

export function normalizeRespondentRole(raw: unknown): RespondentRole | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v === "heavy" || v === "light" || v === "control" || v === "secondary") {
    return v;
  }
  if (v === "second" || v === "priority_2" || v === "2nd" || v === "secondary_priority") {
    return "secondary";
  }
  return null;
}

export const EXTREME_ROLE_LABEL: Record<RespondentRole, string> = {
  heavy: "1순위 · Heavy(많음)",
  light: "1순위 · Light(적음)",
  control: "대조군",
  secondary: "2순위 후보",
};

export const EXTREME_ROLE_HINT: Record<RespondentRole, string> = {
  heavy: "극단 — 문제를 가장 자주·깊게 겪는 쪽",
  light: "극단 — 거의 안 겪거나 우회하는 쪽",
  control: "양 끝과 비교할 기준선",
  secondary: "극단 다음으로 면접·관찰 가치가 큰 그룹",
};
