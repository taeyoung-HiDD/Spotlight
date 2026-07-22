import { levelCoachToneHint } from "@/lib/stages/stage1/levelDiagnostic";
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";

/** 코치 chatContext.artifactSummary 앞에 붙이는 맞춤 톤 지시 */
export function withCoachingLevelHint(
  artifactSummary: string,
  level?: UserCoachingLevel,
): string {
  if (!level) return artifactSummary;
  const hint = levelCoachToneHint(level);
  return artifactSummary.trim() ? `${hint}\n\n${artifactSummary}` : hint;
}
