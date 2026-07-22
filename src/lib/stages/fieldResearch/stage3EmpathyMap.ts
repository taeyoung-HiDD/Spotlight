import type { PrePmfPersonItem } from "@/lib/stages/stage2/prePmfOverview";
import { prePmfPersonDisplayName } from "@/lib/stages/stage2/prePmfOverview";
import { normalizeNemotronPersonaProfile } from "@/lib/personas/nemotronPersona";
import {
  formatPersonaBioSummary,
  normalizePersonaBio,
  personaBioHasContent,
} from "@/lib/stages/stage4/personaBio";
import { migratePrepWorkflowPhase } from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import {
  emptyStage4Quadrants,
  normalizeEmpathyStickyItems,
  quadrantHasContent,
} from "@/lib/stages/stage4/empathySticky";
import { personaLineCartoonFallbackUrl } from "@/lib/stages/stage4/personaThumbnail";
import {
  createStage4PersonaMap,
  type Stage4PersonaEmpathyMap,
} from "@/lib/stages/stage4/types";
import type {
  FieldResearchData,
  Stage3PrepWorkflowPhase,
} from "@/lib/stages/fieldResearch/types";

function migratePersonaThumbnailUrl(
  raw: string | undefined,
  name: string,
  context: string,
): string {
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return "";
  if (url.includes("/9.x/doodle/")) {
    return personaLineCartoonFallbackUrl(name, context);
  }
  return url;
}

export function normalizeStage3EmpathyMaps(
  raw: unknown,
): Stage4PersonaEmpathyMap[] {
  if (!Array.isArray(raw)) return [];
  const maps = raw.slice(0, 8).map((m, idx) => {
    const item = m && typeof m === "object" ? (m as Partial<Stage4PersonaEmpathyMap>) : {};
    const personaName = typeof item.personaName === "string" ? item.personaName : "";
    const personaContext =
      typeof item.personaContext === "string" ? item.personaContext : "";
    return {
      id: item.id || createStage4PersonaMap(idx).id,
      personaName,
      personaContext,
      personaBio: normalizePersonaBio(item.personaBio, {
        name: personaName,
        context: personaContext,
      }),
      personaProfile: normalizeNemotronPersonaProfile(item.personaProfile),
      personaThumbnailUrl: migratePersonaThumbnailUrl(
        item.personaThumbnailUrl,
        personaName,
        personaContext,
      ),
      quadrants: {
        says: normalizeEmpathyStickyItems(item.quadrants?.says),
        thinks: normalizeEmpathyStickyItems(item.quadrants?.thinks),
        does: normalizeEmpathyStickyItems(item.quadrants?.does),
        feels: normalizeEmpathyStickyItems(item.quadrants?.feels),
      },
    };
  });
  return maps.length ? maps : [];
}

function mapHasQuadrantContent(map: Stage4PersonaEmpathyMap): boolean {
  return (
    quadrantHasContent(map.quadrants.says) ||
    quadrantHasContent(map.quadrants.thinks) ||
    quadrantHasContent(map.quadrants.does) ||
    quadrantHasContent(map.quadrants.feels)
  );
}

export function hasStage3EmpathyMapContent(
  data: Pick<FieldResearchData, "empathyMaps">,
): boolean {
  return data.empathyMaps.some(
    (m) =>
      m.personaName.trim() ||
      m.personaContext.trim() ||
      mapHasQuadrantContent(m),
  );
}

/** 공감맵 4분면에 실제 포스트잇 초안이 있는지 (게이트·AI 작성 전 화면 판별) */
export function hasStage3EmpathyQuadrantDraft(
  data: Pick<FieldResearchData, "empathyMaps">,
): boolean {
  return data.empathyMaps.some((m) => mapHasQuadrantContent(m));
}

export function resolveStage3PrepWorkflowPhase(
  raw: unknown,
): Stage3PrepWorkflowPhase {
  return migratePrepWorkflowPhase(raw);
}

/** 사전 조사(2단계) 타겟 유저 → 공감맵 대상 */
export function bootstrapEmpathyMapsFromTargetUsers(
  targetUsers: PrePmfPersonItem[],
  existing: Stage4PersonaEmpathyMap[],
): Stage4PersonaEmpathyMap[] {
  const users = targetUsers.filter(
    (user, index) =>
      prePmfPersonDisplayName(user, index, "타겟").trim() || user.reason.trim(),
  );

  if (!users.length) {
    const fallback = existing.length ? existing : [createStage4PersonaMap(0)];
    return normalizeStage3EmpathyMaps(fallback);
  }

  const hasUserWork = existing.some(
    (map) => mapHasQuadrantContent(map) || map.personaThumbnailUrl.trim(),
  );

  if (!existing.length) {
    return users.map((user, index) => {
      const targetName = prePmfPersonDisplayName(user, index, "타겟");
      const targetContext = user.reason.trim();
      const personaBio = normalizePersonaBio(undefined, {
        name: targetName,
        context: targetContext,
      });
      return {
        ...createStage4PersonaMap(index),
        personaName: targetName,
        personaContext: formatPersonaBioSummary(personaBio) || targetContext,
        personaBio,
      };
    });
  }

  const count = Math.max(users.length, existing.length);
  const next: Stage4PersonaEmpathyMap[] = [];

  for (let index = 0; index < count; index++) {
    const user = users[index];
    const prev = existing[index] ?? createStage4PersonaMap(index);
    if (!user) {
      next.push(prev);
      continue;
    }
    const targetName = prePmfPersonDisplayName(user, index, "타겟");
    const targetContext = user.reason.trim();
    const personaBio =
      hasUserWork && personaBioHasContent(prev.personaBio)
        ? prev.personaBio
        : normalizePersonaBio(prev.personaBio, {
            name: targetName,
            context: targetContext,
          });
    next.push({
      ...prev,
      quadrants: prev.quadrants ?? emptyStage4Quadrants(),
      personaBio,
      personaName:
        hasUserWork && prev.personaName.trim() ? prev.personaName : targetName,
      personaContext:
        hasUserWork && prev.personaContext.trim()
          ? prev.personaContext
          : formatPersonaBioSummary(personaBio) || targetContext || prev.personaContext,
    });
  }

  return normalizeStage3EmpathyMaps(next);
}
