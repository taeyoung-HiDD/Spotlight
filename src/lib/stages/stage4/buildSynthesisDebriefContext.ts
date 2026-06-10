import {
  getSynthesisKindMeta,
  type ResearchSynthesisData,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import {
  formatConductedAtLabel,
  researchMethodLabel,
} from "@/lib/stages/stage4/researchSynthesisSubject";
import {
  researchMediaKindLabel,
  type ResearchMediaFile,
} from "@/lib/stages/stage4/researchMediaTypes";

function formatMediaList(files: ResearchMediaFile[]): string {
  if (!files.length) return "(없음)";
  return files
    .map(
      (f) =>
        `- ${researchMediaKindLabel(f.kind)}: ${f.fileName || f.id}${f.storagePath ? ` (${f.storagePath})` : ""}`,
    )
    .join("\n");
}

/** Kevin 디브리핑 API·채팅 맥락용 텍스트 요약 */
export function buildSynthesisDebriefContext(
  synthesis: ResearchSynthesisData,
): string {
  const lines: string[] = ["[데이터 정리 · 디브리핑 자료 요약]"];

  if (synthesis.themes.length) {
    lines.push(`테마: ${synthesis.themes.join(" · ")}`);
  }

  if (synthesis.teamDebriefNote.trim()) {
    lines.push(`\n팀 디브리핑 메모:\n${synthesis.teamDebriefNote.trim()}`);
  }

  if (synthesis.teamDebriefMediaFiles.length) {
    lines.push(
      `\n팀 디브리핑 음성:\n${formatMediaList(synthesis.teamDebriefMediaFiles)}`,
    );
  }

  for (const subject of synthesis.subjects) {
    const name = subject.name.trim() || "(이름 미정)";
    const notes = synthesis.notes.filter(
      (n) => n.subjectId === subject.id && n.text.trim(),
    );
    const media = subject.mediaFiles;

    lines.push(`\n## 조사 대상: ${name}`);
    if (subject.context.trim()) {
      lines.push(`프로필: ${subject.context.trim()}`);
    }
    if (subject.researchMethodId) {
      lines.push(`방법: ${researchMethodLabel(subject.researchMethodId)}`);
    }
    if (subject.conductedAt.trim()) {
      lines.push(`일시: ${formatConductedAtLabel(subject.conductedAt)}`);
    }

    for (const kind of ["quote", "observation", "finding"] as const) {
      const kindNotes = notes.filter((n) => n.kind === kind);
      if (!kindNotes.length) continue;
      const meta = getSynthesisKindMeta(kind);
      lines.push(`\n[${meta.label}]`);
      for (const n of kindNotes) {
        const theme = n.theme.trim() ? ` (테마: ${n.theme})` : "";
        lines.push(`· ${n.text.trim()}${theme}`);
      }
    }

    if (media.length) {
      lines.push("\n[리서치 미디어]");
      lines.push(formatMediaList(media));
    }
  }

  return lines.join("\n");
}

export function hasSynthesisDebriefSource(
  synthesis: ResearchSynthesisData,
): boolean {
  if (synthesis.teamDebriefNote.trim()) return true;
  if (synthesis.teamDebriefMediaFiles.length > 0) return true;
  if (synthesis.notes.some((n) => n.text.trim())) return true;
  return synthesis.subjects.some((s) => s.mediaFiles.length > 0);
}
