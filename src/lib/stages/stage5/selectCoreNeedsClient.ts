import type { CoreNeedSelectionResult } from "@/lib/stages/stage5/selectCoreNeeds";
import type { NeedQuadrantCell, NeedSignalId } from "@/lib/stages/stage5/latentNeedsTypes";

const CELLS = new Set<NeedQuadrantCell>([
  "high_importance_high_gap",
  "high_importance_low_gap",
  "low_importance_high_gap",
  "low_importance_low_gap",
]);

const SIGNALS = new Set<NeedSignalId>([
  "workaround",
  "frequency",
  "pain",
  "breadth",
  "gap",
]);

function parseSignals(raw: unknown): NeedSignalId[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x): x is NeedSignalId => SIGNALS.has(x as NeedSignalId));
}

function parseCell(raw: unknown, fallback: NeedQuadrantCell): NeedQuadrantCell {
  const cellRaw = String(raw ?? fallback);
  return CELLS.has(cellRaw as NeedQuadrantCell)
    ? (cellRaw as NeedQuadrantCell)
    : fallback;
}

export async function requestCoreNeedsSelection(input: {
  projectId: string;
  problem: string;
  painPoints: string[];
  needs: Array<{
    id: string;
    text: string;
    subjectId: string;
    groupName?: string;
    linkedSourceTexts?: string[];
  }>;
}): Promise<CoreNeedSelectionResult & { source?: string }> {
  const res = await fetch("/api/stage5/select-core-needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as {
    selections?: Array<{
      needId?: unknown;
      cell?: unknown;
      signals?: unknown;
      rationale?: unknown;
    }>;
    placements?: Array<{
      needId?: unknown;
      cell?: unknown;
      signals?: unknown;
    }>;
    parkedNeedIds?: unknown;
    source?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "핵심 니즈 자동 선별에 실패했습니다.");
  }

  const selections = (Array.isArray(json.selections) ? json.selections : [])
    .map((s) => {
      const needId = typeof s.needId === "string" ? s.needId.trim() : "";
      if (!needId) return null;
      return {
        needId,
        cell: parseCell(s.cell, "high_importance_high_gap"),
        signals: parseSignals(s.signals),
        rationale:
          typeof s.rationale === "string" ? s.rationale.trim().slice(0, 200) : "",
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const placements = (Array.isArray(json.placements) ? json.placements : [])
    .map((p) => {
      const needId = typeof p.needId === "string" ? p.needId.trim() : "";
      if (!needId) return null;
      return {
        needId,
        cell: parseCell(p.cell, "low_importance_low_gap"),
        signals: parseSignals(p.signals),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const parkedNeedIds = Array.isArray(json.parkedNeedIds)
    ? json.parkedNeedIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    selections,
    placements,
    parkedNeedIds,
    source: json.source,
  };
}
