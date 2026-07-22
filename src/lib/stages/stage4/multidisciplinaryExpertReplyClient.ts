import type {
  MultidisciplinaryExpertId,
  MultidisciplinaryRootReading,
} from "@/lib/stages/stage4/multidisciplinaryAnalysis";

export async function requestMultidisciplinaryExpertReply(input: {
  projectId: string;
  subjectId: string;
  subjectName: string;
  expertId: MultidisciplinaryExpertId;
  question: string;
  priorInsight?: string;
  quotes?: Array<{ id: string; text: string } | string>;
  observations?: Array<{ id: string; text: string } | string>;
  findings?: Array<{ id: string; text: string } | string>;
  problem?: string;
  rootReading?: MultidisciplinaryRootReading | null;
  noteIds?: string[];
}): Promise<{
  reply: string;
  rootReading: MultidisciplinaryRootReading | null;
}> {
  const res = await fetch("/api/stage4/multidisciplinary-expert-reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => null)) as {
    reply?: string;
    rootReading?: MultidisciplinaryRootReading | null;
    error?: string;
  } | null;
  if (!res.ok) {
    throw new Error(json?.error ?? "전문가 답변 요청에 실패했습니다.");
  }
  const reply = json?.reply?.trim();
  if (!reply) throw new Error("전문가 답변이 비어 있습니다.");
  return {
    reply,
    rootReading: json?.rootReading ?? input.rootReading ?? null,
  };
}
