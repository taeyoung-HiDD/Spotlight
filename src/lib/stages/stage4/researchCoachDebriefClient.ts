import type { ResearchSynthesisData } from "@/lib/stages/stage4/researchSynthesisTypes";

export async function requestKevinSynthesisDebrief({
  projectId,
  synthesis,
}: {
  projectId: string;
  synthesis: ResearchSynthesisData;
}): Promise<string> {
  const res = await fetch("/api/stage4/research-coach-debrief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, synthesis }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(json?.error ?? "디브리핑 요청에 실패했습니다.");
  }

  const json = (await res.json()) as { debrief?: string };
  if (!json.debrief?.trim()) {
    throw new Error("디브리핑 응답이 비어 있습니다.");
  }
  return json.debrief.trim();
}
