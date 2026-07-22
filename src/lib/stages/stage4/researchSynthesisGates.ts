import { quadrantHasContent } from "@/lib/stages/stage4/empathySticky";
import { hasMultidisciplinaryAnalysisContent } from "@/lib/stages/stage4/multidisciplinaryAnalysis";
import { getLinkedEmpathyMap } from "@/lib/stages/stage4/syncSubjectEmpathy";
import type { Stage4DiscoveriesData } from "@/lib/stages/stage4/types";

export function hasEmpathyMapContent(data: Stage4DiscoveriesData): boolean {
  return data.empathyMaps.some(
    (m) =>
      m.personaName.trim() ||
      m.personaContext.trim() ||
      quadrantHasContent(m.quadrants.says) ||
      quadrantHasContent(m.quadrants.thinks) ||
      quadrantHasContent(m.quadrants.does) ||
      quadrantHasContent(m.quadrants.feels),
  );
}

/** @deprecated 단일 페이지로 통합됨 — 하위 호환용 */
export function canAdvanceToSynthesis(data: Stage4DiscoveriesData): boolean {
  return hasEmpathyMapContent(data);
}

export function canAdvanceToStage5(data: Stage4DiscoveriesData): boolean {
  if (hasEmpathyMapContent(data)) return true;
  const rs = data.researchSynthesis;
  if (rs.notes.some((n) => n.text.trim())) return true;
  if (hasMultidisciplinaryAnalysisContent(rs.multidisciplinaryAnalysis)) {
    return true;
  }
  if (rs.subjects.some((s) => s.mediaFiles.length > 0)) return true;
  if (
    rs.subjects.some((s) => {
      const map = getLinkedEmpathyMap(data, s.id);
      if (!map) return false;
      return (
        quadrantHasContent(map.quadrants.says) ||
        quadrantHasContent(map.quadrants.thinks) ||
        quadrantHasContent(map.quadrants.does) ||
        quadrantHasContent(map.quadrants.feels)
      );
    })
  ) {
    return true;
  }
  return rs.subjects.some(
    (s) => s.name.trim() || s.context.trim() || s.thumbnailUrl.trim(),
  );
}
