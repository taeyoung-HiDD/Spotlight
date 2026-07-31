import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import {
  heuristicGenerateLatentNeeds,
  isTemplateLatentNeedText,
} from "@/lib/stages/stage5/generateLatentNeedsHeuristic";
import { cleanLatentNeedText } from "@/lib/stages/stage5/latentNeedText";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  createStage5BoardPostit,
  type Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";
import type { UiLocale } from "@/lib/i18n/uiLocale";

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
  locale: UiLocale = "ko",
): Promise<GenerateLatentNeedsResponse> {
  const res = await fetch("/api/stage5/generate-latent-needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, sources, locale }),
  });

  const json = (await res.json()) as GenerateLatentNeedsResponse & {
    error?: string;
  };

  if (!res.ok) {
    // 네트워크/권한 오류여도 화면이 비지 않도록 휴리스틱으로 채웁니다.
    const heuristic = heuristicGenerateLatentNeeds(sources);
    if (heuristic.length > 0) {
      return { needs: heuristic, source: "heuristic_client" };
    }
    throw new Error(json.error ?? "잠재 니즈 생성에 실패했습니다.");
  }

  if (!Array.isArray(json.needs) || json.needs.length === 0) {
    return {
      needs: heuristicGenerateLatentNeeds(sources),
      source: "heuristic_client",
    };
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
 * 잠재 니즈가 아직 없는(또는 템플릿뿐인) 조사 포스트잇.
 * kevinGeneratedAt만 있고 일부만 채워진 경우에도 나머지를 이어서 생성합니다.
 */
export function buildUncoveredSourceInputsFromBoard(
  data: Stage5LatentNeedsData,
): GenerateLatentNeedsSourceInput[] {
  const covered = new Set<string>();
  for (const p of data.postits) {
    if (p.kind !== "latent_need" || !p.text.trim()) continue;
    if (p.kevinGenerated && isTemplateLatentNeedText(p.text)) continue;
    for (const id of p.linkedSourceIds ?? []) {
      if (id) covered.add(id);
    }
  }
  return buildSourceInputsFromBoard(data).filter(
    (s) => !covered.has(s.sourceId),
  );
}

/** 진입 시 Kevin 잠재 니즈 생성이 필요한지 */
export function boardNeedsLatentNeedsGeneration(
  data: Stage5LatentNeedsData,
): boolean {
  if (boardHasTemplateLatentNeeds(data)) return true;
  return buildUncoveredSourceInputsFromBoard(data).length > 0;
}

/** 과거 폴백 템플릿·비허용 문자(키릴 등)로 작성된 Kevin 잠재 니즈가 보드에 남아 있는지 */
export function boardHasTemplateLatentNeeds(
  data: Stage5LatentNeedsData,
): boolean {
  return data.postits.some(
    (p) =>
      p.kind === "latent_need" &&
      p.kevinGenerated &&
      isTemplateLatentNeedText(p.text),
  );
}

/**
 * Kevin 초안 잠재 니즈를 교체하고, 각 조사 포스트잇에 1개씩 붙입니다.
 * 사용자가 직접 쓴 잠재 니즈는 유지합니다.
 * 쓸 수 있는 결과가 없으면(AI 실패) 기존 데이터를 그대로 두어 다음에 재시도합니다.
 */
export function applyGeneratedLatentNeeds(
  data: Stage5LatentNeedsData,
  result: GenerateLatentNeedsResponse,
): Stage5LatentNeedsData {
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
    if (!trimmed || isTemplateLatentNeedText(trimmed)) continue;

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

  if (generated.length === 0) return data;

  // 이번 배치가 채우지 못한 소스의 기존 카드는 지우지 않고 유지합니다
  // (형식 오류로 필터링돼 재시도까지 실패한 경우 보드가 비지 않도록).
  const replacedSourceIds = new Set(seenSource);
  const kept = data.postits.filter((p) => {
    if (p.kind !== "latent_need" || !p.kevinGenerated) return true;
    const linkedIds = p.linkedSourceIds ?? [];
    return !linkedIds.some((id) => replacedSourceIds.has(id));
  });

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
