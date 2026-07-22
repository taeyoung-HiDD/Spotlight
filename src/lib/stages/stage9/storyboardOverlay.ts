import type { ImageOverlayText } from "@/lib/stages/imageOverlayTypes";
import {
  STORYBOARD_CUT_COUNT,
  type ConceptSheetData,
  type StoryboardCut,
} from "@/lib/stages/stage9/conceptSheetTypes";

/** 스토리보드 컷 + 컨셉 시트 → 오버레이 한글 텍스트 JSON */
export function buildStoryboardOverlay(
  cut: StoryboardCut,
  concept: ConceptSheetData,
): ImageOverlayText {
  const isFinale = cut.index === STORYBOARD_CUT_COUNT;
  const primaryFeature = concept.features.find((f) => f.trim())?.trim();

  return {
    title: concept.conceptName.trim() || undefined,
    description: isFinale ? concept.oneLiner.trim() || undefined : undefined,
    buttonLabel:
      isFinale && primaryFeature ? primaryFeature.slice(0, 24) : undefined,
    caption: cut.caption.trim() || undefined,
  };
}
