import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  defaultConceptSheet,
  type ConceptSheetData,
} from "@/lib/stages/stage9/conceptSheetTypes";

function pickLatentNeed(s5: Stage5LatentNeedsData): {
  need: string;
  quote: string;
} {
  const latent = s5.postits.find(
    (p) => p.kind === "latent_need" && p.text.trim(),
  );
  const quote = s5.postits.find(
    (p) => p.kind === "quote" && p.text.trim(),
  );
  return {
    need: latent?.text.trim() ?? "",
    quote: quote?.text.trim() ?? "",
  };
}

export function mergePriorStagesIntoConcept(
  current: ConceptSheetData,
  s5: Stage5LatentNeedsData,
): ConceptSheetData {
  const base = current;
  const { need, quote } = pickLatentNeed(s5);

  return {
    ...base,
    trueNeed: base.trueNeed.trim() || need,
    trueNeedQuote: base.trueNeedQuote.trim() || quote,
  };
}

export function bootstrapConceptFromPriorStages(
  s5: Stage5LatentNeedsData,
): ConceptSheetData {
  return mergePriorStagesIntoConcept(defaultConceptSheet(), s5);
}
