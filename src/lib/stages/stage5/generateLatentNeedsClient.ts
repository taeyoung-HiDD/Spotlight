import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import { cleanLatentNeedText } from "@/lib/stages/stage5/latentNeedText";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  createStage5BoardPostit,
  type Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";

export interface GenerateLatentNeedsSubjectInput {
  subjectId: string;
  name: string;
  quotes: string[];
  observations: string[];
}

export interface GenerateLatentNeedsResponse {
  needs: Array<{ subjectId: string; items: string[] }>;
  source?: string;
}

export async function requestLatentNeedsGeneration(
  projectId: string,
  subjects: GenerateLatentNeedsSubjectInput[],
): Promise<GenerateLatentNeedsResponse> {
  const res = await fetch("/api/stage5/generate-latent-needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, subjects }),
  });

  const json = (await res.json()) as GenerateLatentNeedsResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "잠재 니즈 생성에 실패했습니다.");
  }

  return json;
}

export function buildSubjectInputsFromBoard(
  data: Stage5LatentNeedsData,
): GenerateLatentNeedsSubjectInput[] {
  return data.subjects
    .map((subject) => ({
      subjectId: subject.id,
      name: subject.name,
      quotes: data.postits
        .filter((p) => p.subjectId === subject.id && p.kind === "quote")
        .map((p) => p.text.trim())
        .filter(Boolean),
      observations: data.postits
        .filter(
          (p) =>
            p.subjectId === subject.id &&
            (p.kind === "observation" || p.kind === "finding"),
        )
        .map((p) => p.text.trim())
        .filter(Boolean),
    }))
    .filter((input) => input.quotes.length > 0 || input.observations.length > 0);
}

export function applyGeneratedLatentNeeds(
  data: Stage5LatentNeedsData,
  result: GenerateLatentNeedsResponse,
): Stage5LatentNeedsData {
  const sourceAndUser = data.postits.filter(
    (p) => p.kind !== "latent_need" || !p.kevinGenerated,
  );

  const generated: Stage5LatentNeedsData["postits"] = [];
  for (const block of result.needs) {
    const sourceIds = data.postits
      .filter(
        (p) =>
          p.subjectId === block.subjectId && isStage5SourcePostitKind(p.kind),
      )
      .map((p) => p.id);

    const items = block.items
      .map((text) => cleanLatentNeedText(text))
      .filter(Boolean);

    items.forEach((trimmed, idx) => {
      const linkedId =
        sourceIds.length > 0
          ? sourceIds[idx % sourceIds.length]!
          : undefined;
      generated.push(
        createStage5BoardPostit(block.subjectId, "latent_need", {
          text: trimmed,
          readonly: false,
          kevinGenerated: true,
          linkedSourceIds: linkedId ? [linkedId] : undefined,
        }),
      );
    });
  }

  return {
    ...data,
    postits: [...sourceAndUser, ...generated],
    kevinGeneratedAt: new Date().toISOString(),
  };
}

export function subjectRefById(
  subjects: Stage5SubjectRef[],
  subjectId: string,
): Stage5SubjectRef | undefined {
  return subjects.find((s) => s.id === subjectId);
}
