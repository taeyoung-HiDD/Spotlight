import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import { cleanLatentNeedText } from "@/lib/stages/stage5/latentNeedText";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  createStage5BoardPostit,
  type Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";

export interface GenerateLatentNeedsSourceInput {
  sourceId: string;
  subjectId: string;
  subjectName: string;
  kind: "quote" | "observation" | "finding";
  text: string;
}

export interface GenerateLatentNeedsResponse {
  needs: Array<{ sourceId: string; subjectId: string; text: string }>;
  source?: string;
}

export async function requestLatentNeedsGeneration(
  projectId: string,
  sources: GenerateLatentNeedsSourceInput[],
): Promise<GenerateLatentNeedsResponse> {
  const res = await fetch("/api/stage5/generate-latent-needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, sources }),
  });

  const json = (await res.json()) as GenerateLatentNeedsResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "잠재 니즈 생성에 실패했습니다.");
  }

  return json;
}

/** 텍스트가 있는 조사 결과 포스트잇 → AI 입력 */
export function buildSourceInputsFromBoard(
  data: Stage5LatentNeedsData,
): GenerateLatentNeedsSourceInput[] {
  const nameById = new Map(
    data.subjects.map((s) => [s.id, s.name.trim()] as const),
  );

  return data.postits.flatMap((p) => {
    if (!isStage5SourcePostitKind(p.kind) || !p.text.trim()) return [];
    return [
      {
        sourceId: p.id,
        subjectId: p.subjectId,
        subjectName: nameById.get(p.subjectId) ?? "",
        kind: p.kind,
        text: p.text.trim(),
      },
    ];
  });
}

/**
 * Kevin 초안 잠재 니즈를 교체하고, 각 조사 포스트잇에 1개씩 붙입니다.
 * 사용자가 직접 쓴 잠재 니즈는 유지합니다.
 */
export function applyGeneratedLatentNeeds(
  data: Stage5LatentNeedsData,
  result: GenerateLatentNeedsResponse,
): Stage5LatentNeedsData {
  const kept = data.postits.filter(
    (p) => p.kind !== "latent_need" || !p.kevinGenerated,
  );

  const validSourceIds = new Set(
    data.postits
      .filter((p) => isStage5SourcePostitKind(p.kind))
      .map((p) => p.id),
  );

  const generated: Stage5LatentNeedsData["postits"] = [];
  const seenSource = new Set<string>();

  for (const item of result.needs) {
    const sourceId = item.sourceId.trim();
    if (!sourceId || !validSourceIds.has(sourceId) || seenSource.has(sourceId)) {
      continue;
    }
    const trimmed = cleanLatentNeedText(item.text);
    if (!trimmed) continue;

    const source = data.postits.find((p) => p.id === sourceId);
    const subjectId = source?.subjectId ?? item.subjectId;
    if (!subjectId) continue;

    seenSource.add(sourceId);
    generated.push(
      createStage5BoardPostit(subjectId, "latent_need", {
        text: trimmed,
        readonly: false,
        kevinGenerated: true,
        linkedSourceIds: [sourceId],
      }),
    );
  }

  return {
    ...data,
    postits: [...kept, ...generated],
    kevinGeneratedAt: new Date().toISOString(),
  };
}

export function subjectRefById(
  subjects: Stage5SubjectRef[],
  subjectId: string,
): Stage5SubjectRef | undefined {
  return subjects.find((s) => s.id === subjectId);
}
