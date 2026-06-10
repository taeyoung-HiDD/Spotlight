import type { Stage4PersonaEmpathyMap } from "@/lib/stages/stage4/types";

export interface Stage5BaselineContext {
  startingPoint: string;
  personaName: string;
  personaSituation: string;
  empathyMaps: Stage4PersonaEmpathyMap[];
}

export const EMPTY_STAGE5_BASELINE: Stage5BaselineContext = {
  startingPoint: "",
  personaName: "",
  personaSituation: "",
  empathyMaps: [],
};

export interface Stage5SaysQuote {
  personaLabel: string;
  text: string;
}

/** 4단계 공감맵 Says(말함) 항목 수집 */
export function extractSaysFromEmpathyMaps(
  maps: Stage4PersonaEmpathyMap[],
): Stage5SaysQuote[] {
  const out: Stage5SaysQuote[] = [];
  for (const [idx, map] of maps.entries()) {
    const personaLabel = map.personaName.trim() || `페르소나 ${idx + 1}`;
    for (const item of map.quadrants.says) {
      const text = item.text.trim();
      if (text) out.push({ personaLabel, text });
    }
  }
  return out;
}
