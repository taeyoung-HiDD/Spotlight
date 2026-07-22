import { createClient } from "@/lib/supabase/server";
import { loadToKnowBuildContext } from "@/lib/stages/fieldResearch/stage3Bootstrap";
import {
  normalizeStage4Data,
  type Stage4DiscoveriesData,
  type Stage4PersonaEmpathyMap,
} from "@/lib/stages/stage4/types";
import type { ResearchSynthesisData } from "@/lib/stages/stage4/researchSynthesisTypes";
import {
  formatConductedAtLabel,
  researchMethodLabel,
} from "@/lib/stages/stage4/researchSynthesisSubject";

export interface MdaNoteRef {
  id: string;
  kind: "quote" | "observation" | "finding";
  text: string;
}

export interface MdaSubjectContext {
  subjectId: string;
  subjectName: string;
  context: string;
  researchMethod: string;
  conductedAt: string;
  quotes: MdaNoteRef[];
  observations: MdaNoteRef[];
  findings: MdaNoteRef[];
  empathySummary: string;
}

export interface MdaDeepContextPack {
  problem: string;
  prePmfSummary: string;
  teamDebriefNote: string;
  subjects: MdaSubjectContext[];
  /** subjectId → note ids */
  allowedNoteIdsBySubject: Map<string, Set<string>>;
}

function summarizeEmpathyMap(map: Stage4PersonaEmpathyMap | undefined): string {
  if (!map) return "(공감맵 없음)";
  const lines: string[] = [];
  if (map.personaName.trim()) lines.push(`이름: ${map.personaName.trim()}`);
  if (map.personaContext.trim()) {
    lines.push(`한줄: ${map.personaContext.trim()}`);
  }
  const bio = map.personaBio;
  const bioLine = [bio.name, bio.age, bio.occupation, bio.familyRelations]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(" · ");
  if (bioLine) lines.push(`바이오: ${bioLine.slice(0, 280)}`);
  const q = map.quadrants;
  const pick = (items: { text: string }[], label: string) => {
    const texts = items
      .map((i) => i.text.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (texts.length) lines.push(`${label}: ${texts.join(" / ")}`);
  };
  pick(q.says, "말함");
  pick(q.thinks, "생각");
  pick(q.does, "행동");
  pick(q.feels, "느낌");
  return lines.length ? lines.join("\n") : "(공감맵 비어 있음)";
}

function matchEmpathyForSubject(
  maps: Stage4PersonaEmpathyMap[],
  subjectName: string,
  index: number,
): Stage4PersonaEmpathyMap | undefined {
  const name = subjectName.trim().toLowerCase();
  if (name) {
    const byName = maps.find(
      (m) => m.personaName.trim().toLowerCase() === name,
    );
    if (byName) return byName;
  }
  return maps[index];
}

async function loadStage4EmpathyMaps(
  projectId: string,
): Promise<Stage4PersonaEmpathyMap[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("artifacts")
      .select("slots")
      .eq("project_id", projectId)
      .eq("stage_id", 4)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as { slots?: unknown } | null;
    if (!row?.slots || typeof row.slots !== "object") return [];
    const slots = row.slots as Record<string, { content?: unknown }>;
    const maps = slots.empathy_maps?.content;
    if (!maps || typeof maps !== "object") return [];
    return normalizeStage4Data(
      maps as Partial<Stage4DiscoveriesData>,
    ).empathyMaps;
  } catch {
    return [];
  }
}

/** Stage1~3 + 디브리프 + 노트 id를 담은 MDA 입력 팩 */
export async function buildMdaDeepContextPack(
  projectId: string,
  synthesis: ResearchSynthesisData,
): Promise<MdaDeepContextPack> {
  let problem = "";
  let prePmfSummary = "";
  try {
    const ctx = await loadToKnowBuildContext(projectId);
    problem = ctx.startingPoint.trim();
    prePmfSummary = (ctx.contextualInsights ?? "").trim();
  } catch {
    /* ignore */
  }

  const empathyMaps = await loadStage4EmpathyMaps(projectId);
  const allowedNoteIdsBySubject = new Map<string, Set<string>>();

  const subjects: MdaSubjectContext[] = synthesis.subjects
    .map((s, idx) => {
      const notes = synthesis.notes.filter((n) => n.subjectId === s.id);
      const quotes = notes
        .filter((n) => n.kind === "quote" && n.text.trim())
        .map((n) => ({ id: n.id, kind: "quote" as const, text: n.text.trim() }));
      const observations = notes
        .filter((n) => n.kind === "observation" && n.text.trim())
        .map((n) => ({
          id: n.id,
          kind: "observation" as const,
          text: n.text.trim(),
        }));
      const findings = notes
        .filter((n) => n.kind === "finding" && n.text.trim())
        .map((n) => ({
          id: n.id,
          kind: "finding" as const,
          text: n.text.trim(),
        }));
      const subjectName = s.name.trim() || `조사 대상 ${idx + 1}`;
      const allIds = new Set(
        [...quotes, ...observations, ...findings].map((n) => n.id),
      );
      allowedNoteIdsBySubject.set(s.id, allIds);

      return {
        subjectId: s.id,
        subjectName,
        context: s.context.trim(),
        researchMethod: s.researchMethodId
          ? researchMethodLabel(s.researchMethodId)
          : "",
        conductedAt: s.conductedAt.trim()
          ? formatConductedAtLabel(s.conductedAt)
          : "",
        quotes,
        observations,
        findings,
        empathySummary: summarizeEmpathyMap(
          matchEmpathyForSubject(empathyMaps, subjectName, idx),
        ),
      };
    })
    .filter(
      (s) =>
        s.quotes.length +
          s.observations.length +
          s.findings.length >
          0 ||
        s.context.length > 0,
    );

  return {
    problem,
    prePmfSummary,
    teamDebriefNote: synthesis.teamDebriefNote.trim(),
    subjects,
    allowedNoteIdsBySubject,
  };
}

export function formatMdaDeepContextForPrompt(pack: MdaDeepContextPack): string {
  const blocks = pack.subjects.map((s) => {
    const fmt = (items: MdaNoteRef[], label: string) =>
      items.length
        ? items.map((n, i) => `  - ${label} ${i + 1} [noteId=${n.id}]: ${n.text}`).join("\n")
        : `  - (${label} 없음)`;
    return `[subjectId=${s.subjectId} · ${s.subjectName}]
프로필: ${s.context || "(없음)"}
조사방법: ${s.researchMethod || "(미정)"}
일시: ${s.conductedAt || "(미정)"}
공감맵 요지:
${s.empathySummary}
${fmt(s.quotes, "언급")}
${fmt(s.observations, "관찰")}
${fmt(s.findings, "발견")}`;
  });

  return `프로젝트 주제(문제):
${pack.problem || "(미정)"}

Pre-PMF·사전 조사 요약:
${pack.prePmfSummary || "(없음)"}

팀 디브리핑 메모:
${pack.teamDebriefNote || "(없음)"}

조사 자료 (noteId는 sourceRefs에 그대로 사용):
${blocks.join("\n\n")}`;
}
