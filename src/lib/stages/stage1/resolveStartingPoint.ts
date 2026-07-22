import {
  fetchStage1CollectState,
  saveStage1CollectState,
} from "@/lib/artifacts/stage1Collect";
import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";

/** 프로젝트 제목이 아닌 출발 문제 문장처럼 보이는지 (레거시: 제목 칸에 문제를 적은 경우) */
function looksLikeProblemStatement(text: string): boolean {
  const t = text.trim();
  if (t.length < 10) return false;
  if (t === "새 프로젝트") return false;
  return /(어렵|불편|문제|힘들|불만|필요|찾기|하고\s*싶|해요|어요|습니다)/.test(t);
}

/**
 * 단계 2+에서 쓸 1단계 출발 입력(사용자 문제·초기 아이디어).
 * artifact → projects.description → (레거시) 문제형 프로젝트 제목 순으로 조회.
 */
export async function resolveStage1StartingPoint(projectId: string): Promise<string> {
  const { state } = await fetchStage1CollectState(projectId);
  const fromArtifact = state.startingPoint?.trim() ?? "";
  if (fromArtifact) return fromArtifact;

  const supabase = createClient();
  await ensureAuthSession(supabase);

  const { data: project, error } = await supabase
    .from("projects")
    .select("title, description")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) return "";

  const description =
    typeof project.description === "string" ? project.description.trim() : "";
  if (description) return description;

  const title = typeof project.title === "string" ? project.title.trim() : "";
  const fromTitle = title && looksLikeProblemStatement(title) ? title : "";
  const resolved = description || fromTitle;
  if (!resolved) return "";

  void saveStage1CollectState(
    projectId,
    { ...state, startingPoint: resolved },
    state.projectTitle.trim() || title || null,
  );

  return resolved;
}
