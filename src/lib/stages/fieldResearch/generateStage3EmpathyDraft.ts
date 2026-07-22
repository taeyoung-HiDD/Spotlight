import {
  COACH_EMPATHY_MAP_CONTENT_RULE,
  COACH_EMPATHY_MAP_STRUCTURE_RULE,
} from "@/lib/coach/empathyMapCoachRules";
import {
  formatNemotronProfilePromptBlock,
  nemotronProfileHasContent,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";
import {
  EMPATHY_MAP_MIN_PER_QUADRANT,
  EMPATHY_QUADRANTS,
  type EmpathyQuadrantId,
} from "@/lib/stages/stage2/empathyMap";
import { createEmpathyStickyItem } from "@/lib/stages/stage4/empathySticky";
import {
  heuristicPersonaBio,
  normalizePersonaBio,
  personaBioFromNemotronProfile,
  type PersonaBio,
} from "@/lib/stages/stage4/personaBio";
import {
  applyPersonaBioToMapFields,
  type Stage4PersonaEmpathyMap,
} from "@/lib/stages/stage4/types";

export interface Stage3EmpathyDraftPersona {
  personaName: string;
  personaContext: string;
  personaBio?: PersonaBio;
  /** Nemotron 가상 사용자 프로필 — 있으면 이 인물처럼 생각·답변 */
  personaProfile?: NemotronPersonaProfile;
}

export interface Stage3EmpathyDraftQuadrants {
  says: string[];
  thinks: string[];
  does: string[];
  feels: string[];
}

export interface Stage3EmpathyDraftMap extends Stage3EmpathyDraftQuadrants {
  bio: PersonaBio;
}

export interface Stage3EmpathyDraftInput {
  problem: string;
  prePmfSummary?: string;
  personas: Stage3EmpathyDraftPersona[];
}

const QUADRANT_IDS: EmpathyQuadrantId[] = ["says", "thinks", "does", "feels"];

function clipStrings(values: unknown, max = 120): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text) continue;
    out.push(text.slice(0, max));
    if (out.length >= 4) break;
  }
  return out;
}

function clipFeelsStrings(values: unknown): string[] {
  return clipStrings(values, 180);
}

function normalizeBioFromRaw(
  raw: unknown,
  persona: Stage3EmpathyDraftPersona,
): PersonaBio {
  return normalizePersonaBio(raw, {
    name: persona.personaName,
    context: persona.personaContext,
  });
}

function normalizeQuadrants(raw: unknown): Stage3EmpathyDraftQuadrants {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    says: clipStrings(o.says),
    thinks: clipStrings(o.thinks),
    does: clipStrings(o.does),
    feels: clipFeelsStrings(o.feels),
  };
}

function normalizeDraftMap(
  raw: unknown,
  persona: Stage3EmpathyDraftPersona,
): Stage3EmpathyDraftMap {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const quadrants = normalizeQuadrants(o);
  const bio = normalizeBioFromRaw(o.bio, persona);
  return { ...quadrants, bio };
}

function padQuadrant(
  items: string[],
  quadrantId: EmpathyQuadrantId,
  persona: Stage3EmpathyDraftPersona,
): string[] {
  const min = EMPATHY_MAP_MIN_PER_QUADRANT;
  const maxLen = quadrantId === "feels" ? 180 : 120;
  const trimmed = items.map((t) => t.trim().slice(0, maxLen)).filter(Boolean);
  if (trimmed.length >= min) return trimmed.slice(0, 4);
  const def = EMPATHY_QUADRANTS.find((q) => q.id === quadrantId)!;
  const name = persona.personaName.trim() || "이 사용자";
  const extras = def.coachSuggestions.map((s) =>
    quadrantId === "feels" ? s : `${name} — ${s}`.slice(0, maxLen),
  );
  const merged = [...trimmed];
  for (const extra of extras) {
    if (merged.length >= min) break;
    if (!merged.some((x) => x === extra)) merged.push(extra);
  }
  while (merged.length < min) {
    merged.push(
      def.coachSuggestions[merged.length % def.coachSuggestions.length]!.slice(
        0,
        maxLen,
      ),
    );
  }
  return merged.slice(0, 4);
}

export function buildStage3EmpathyDraftPrompt(
  input: Stage3EmpathyDraftInput,
): string {
  const problem = input.problem.trim().slice(0, 1200);
  const summary = input.prePmfSummary?.trim().slice(0, 2000) ?? "";
  const personaBlocks = input.personas
    .map((p, idx) => {
      const name = p.personaName.trim() || `타겟 ${idx + 1}`;
      const ctx = p.personaContext.trim();
      const bio = p.personaBio;
      const bioLine =
        bio &&
        (bio.name || bio.age || bio.occupation || bio.familyRelations)
          ? `\n기존 Bio: ${JSON.stringify(bio)}`
          : "";
      const profileBlock = nemotronProfileHasContent(p.personaProfile)
        ? `\n가상 사용자 프로필 (이 인물처럼 생각·말함):\n${formatNemotronProfilePromptBlock(p.personaProfile)}`
        : "";
      return `[${idx + 1}] ${name}${ctx ? `\n맥락: ${ctx}` : ""}${bioLine}${profileBlock}`;
    })
    .join("\n\n");

  const hasProfiles = input.personas.some((p) =>
    nemotronProfileHasContent(p.personaProfile),
  );

  return `
당신은 창업 코치의 공감맵(Empathy Map) 초안 작성 보조입니다.
1단계 문제 정의와 2단계 사전 조사를 바탕으로, **아직 현장 조사 전** 가설 공감맵과 페르소나 Bio를 채웁니다.

${COACH_EMPATHY_MAP_STRUCTURE_RULE}

${COACH_EMPATHY_MAP_CONTENT_RULE}

추가 규칙:
- 각 페르소나마다 **bio**(name·age·occupation·familyRelations)와 말함·생각함·행동함·느낌 **각 ${EMPATHY_MAP_MIN_PER_QUADRANT}~3개** 포스트잇.
- 느낌(feels)은 **짧은 감정 문장**으로 씁니다 (예: 「뭘 선택해야 할지 몰라서 마음이 조급해요.」).
- bio 각 필드는 짧은 명사구, 포스트잇은 구어체(~해요) 문장.
${hasProfiles ? `- 「가상 사용자 프로필」이 있는 페르소나는 한국 인구 통계 기반으로 합성된 **실제에 가까운 인물**입니다. 이 인물의 성격·직업·가족·말투가 배어나도록, **그 사람이 실제로 생각하고 말한 것처럼** 1인칭 관점으로 작성합니다. bio의 이름·나이·직업·가족도 프로필을 그대로 반영합니다.\n` : ""}- 모든 내용은 **가설**임을 전제로, 사전 조사·일반적 사용자 행태에서 추론한 표현만 씁니다.
- 창업자 본인의 Hopes·Pain/Gain·니즈 정의문은 넣지 마세요.
- JSON만 출력합니다. 마크다운·설명 없음.

문제 정의:
${problem || "(없음)"}

${summary ? `사전 조사 요약:\n${summary}\n` : ""}
타겟 유저 (${input.personas.length}명):
${personaBlocks}

출력 형식:
{"maps":[{"bio":{"name":"...","age":"...","occupation":"...","familyRelations":"..."},"says":["..."],"thinks":["..."],"does":["..."],"feels":["..."]}]}
maps 배열 길이는 타겟 유저 수(${input.personas.length})와 같아야 합니다.
`.trim();
}

export function parseStage3EmpathyDraftJson(
  text: string,
  personas: Stage3EmpathyDraftPersona[],
): Stage3EmpathyDraftMap[] | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { maps?: unknown };
    if (!Array.isArray(parsed.maps) || !parsed.maps.length) return null;
    const maps = parsed.maps
      .slice(0, personas.length)
      .map((m, idx) => normalizeDraftMap(m, personas[idx]!));
    if (!maps.length) return null;
    while (maps.length < personas.length) {
      maps.push(
        normalizeDraftMap(
          {},
          personas[maps.length] ?? { personaName: "", personaContext: "" },
        ),
      );
    }
    return maps;
  } catch {
    return null;
  }
}

export function heuristicStage3EmpathyDraft(
  input: Stage3EmpathyDraftInput,
): Stage3EmpathyDraftMap[] {
  return input.personas.map((persona) => {
    const quadrants: Stage3EmpathyDraftQuadrants = {
      says: [],
      thinks: [],
      does: [],
      feels: [],
    };
    for (const id of QUADRANT_IDS) {
      const def = EMPATHY_QUADRANTS.find((q) => q.id === id)!;
      quadrants[id] = padQuadrant(
        def.coachSuggestions.slice(0, EMPATHY_MAP_MIN_PER_QUADRANT),
        id,
        persona,
      );
    }
    return {
      ...quadrants,
      bio: nemotronProfileHasContent(persona.personaProfile)
        ? personaBioFromNemotronProfile(
            persona.personaProfile,
            persona.personaName,
          )
        : heuristicPersonaBio({
            personaName: persona.personaName,
            personaContext: persona.personaContext,
          }),
    };
  });
}

export function normalizeStage3EmpathyDraftMaps(
  rawMaps: Stage3EmpathyDraftMap[],
  input: Stage3EmpathyDraftInput,
): Stage3EmpathyDraftMap[] {
  return input.personas.map((persona, idx) => {
    const raw = rawMaps[idx] ?? normalizeDraftMap({}, persona);
    return {
      bio: normalizeBioFromRaw(raw.bio, persona),
      says: padQuadrant(raw.says, "says", persona),
      thinks: padQuadrant(raw.thinks, "thinks", persona),
      does: padQuadrant(raw.does, "does", persona),
      feels: padQuadrant(raw.feels, "feels", persona),
    };
  });
}

function quadrantsToSticky(
  quadrants: Stage3EmpathyDraftQuadrants,
): Stage4PersonaEmpathyMap["quadrants"] {
  const toItems = (texts: string[]) =>
    texts.map((text) => ({
      ...createEmpathyStickyItem(),
      text,
      fromSuggestion: true as const,
    }));
  return {
    says: toItems(quadrants.says),
    thinks: toItems(quadrants.thinks),
    does: toItems(quadrants.does),
    feels: toItems(quadrants.feels),
  };
}

/** AI·휴리스틱 초안을 기존 공감맵 슬롯에 병합 (썸네일은 유지) */
export function applyStage3EmpathyDraftToMaps(
  existing: Stage4PersonaEmpathyMap[],
  draftMaps: Stage3EmpathyDraftMap[],
  profiles?: Array<NemotronPersonaProfile | null | undefined>,
): Stage4PersonaEmpathyMap[] {
  return existing.map((map, idx) => {
    const draft = draftMaps[idx];
    if (!draft) return map;
    const bioFields = applyPersonaBioToMapFields(map, draft.bio);
    return {
      ...map,
      ...bioFields,
      personaProfile: profiles?.[idx] ?? map.personaProfile,
      quadrants: quadrantsToSticky(draft),
    };
  });
}
