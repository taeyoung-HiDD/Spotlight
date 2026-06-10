import type {
  EmpathyQuadrantId,
  EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";

export function createEmpathyStickyItem(): EmpathyStickyItem {
  return {
    id: `sticky-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: "",
  };
}

export function normalizeEmpathyStickyItems(raw: unknown): EmpathyStickyItem[] {
  if (!Array.isArray(raw)) return [];

  const out: EmpathyStickyItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) continue;
      out.push({
        id: `sticky-legacy-${i}-${text.slice(0, 8)}`,
        text,
      });
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Partial<EmpathyStickyItem>;
      const text = typeof o.text === "string" ? o.text : "";
      out.push({
        id:
          typeof o.id === "string" && o.id
            ? o.id
            : createEmpathyStickyItem().id,
        text,
        fromSuggestion: o.fromSuggestion,
      });
    }
  }
  return out;
}

export function emptyStage4Quadrants(): Record<
  EmpathyQuadrantId,
  EmpathyStickyItem[]
> {
  return { says: [], thinks: [], does: [], feels: [] };
}

export function quadrantHasContent(items: EmpathyStickyItem[]): boolean {
  return items.some((item) => item.text.trim().length > 0);
}
