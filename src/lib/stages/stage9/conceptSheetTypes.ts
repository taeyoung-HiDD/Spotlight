export const STORYBOARD_CUT_COUNT = 5;

export type StoryboardCut = {
  index: number;
  caption: string;
  imageUrl?: string;
  imageSource?: "gemini" | "fallback";
};

export type ConceptSheetData = {
  conceptName: string;
  oneLiner: string;
  features: [string, string, string];
  trueNeed: string;
  trueNeedQuote: string;
  storyboardCuts: StoryboardCut[];
};

export function defaultStoryboardCuts(): StoryboardCut[] {
  return Array.from({ length: STORYBOARD_CUT_COUNT }, (_, i) => ({
    index: i + 1,
    caption: "",
  }));
}

export function defaultConceptSheet(): ConceptSheetData {
  return {
    conceptName: "",
    oneLiner: "",
    features: ["", "", ""],
    trueNeed: "",
    trueNeedQuote: "",
    storyboardCuts: defaultStoryboardCuts(),
  };
}

export function normalizeConceptSheet(
  raw: Partial<ConceptSheetData> | null | undefined,
): ConceptSheetData {
  const base = defaultConceptSheet();
  if (!raw || typeof raw !== "object") return base;

  const cuts = Array.isArray(raw.storyboardCuts)
    ? raw.storyboardCuts
        .filter((c) => c && typeof c === "object")
        .map((c, i) => ({
          index:
            typeof (c as StoryboardCut).index === "number"
              ? (c as StoryboardCut).index
              : i + 1,
          caption:
            typeof (c as StoryboardCut).caption === "string"
              ? (c as StoryboardCut).caption
              : "",
          imageUrl:
            typeof (c as StoryboardCut).imageUrl === "string"
              ? (c as StoryboardCut).imageUrl
              : undefined,
          imageSource:
            (c as StoryboardCut).imageSource === "gemini" ||
            (c as StoryboardCut).imageSource === "fallback"
              ? (c as StoryboardCut).imageSource
              : undefined,
        }))
    : [];

  const normalizedCuts = defaultStoryboardCuts().map((def, i) => {
    const found = cuts.find((c) => c.index === def.index) ?? cuts[i];
    return found
      ? { ...def, ...found, index: def.index }
      : def;
  });

  const featuresRaw = Array.isArray(raw.features) ? raw.features : [];
  const features: [string, string, string] = [
    typeof featuresRaw[0] === "string" ? featuresRaw[0] : "",
    typeof featuresRaw[1] === "string" ? featuresRaw[1] : "",
    typeof featuresRaw[2] === "string" ? featuresRaw[2] : "",
  ];

  return {
    conceptName:
      typeof raw.conceptName === "string" ? raw.conceptName : base.conceptName,
    oneLiner: typeof raw.oneLiner === "string" ? raw.oneLiner : base.oneLiner,
    features,
    trueNeed: typeof raw.trueNeed === "string" ? raw.trueNeed : base.trueNeed,
    trueNeedQuote:
      typeof raw.trueNeedQuote === "string"
        ? raw.trueNeedQuote
        : base.trueNeedQuote,
    storyboardCuts: normalizedCuts,
  };
}

export function isConceptSheetReadyForStoryboard(data: ConceptSheetData): boolean {
  return Boolean(
    data.conceptName.trim() &&
      data.oneLiner.trim() &&
      data.features.every((f) => f.trim()) &&
      data.trueNeed.trim(),
  );
}

export function hasStoryboardCaptions(data: ConceptSheetData): boolean {
  return data.storyboardCuts.some((c) => c.caption.trim());
}

export function hasConceptSheetContent(data: ConceptSheetData): boolean {
  return Boolean(
    data.conceptName.trim() ||
      data.oneLiner.trim() ||
      data.features.some((f) => f.trim()) ||
      data.trueNeed.trim() ||
      hasStoryboardCaptions(data) ||
      data.storyboardCuts.some((c) => c.imageUrl),
  );
}
