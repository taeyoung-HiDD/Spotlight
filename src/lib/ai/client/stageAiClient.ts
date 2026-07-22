import type { PrototypePlatform } from "@/lib/stages/stage10/prototypeTypes";

export async function requestSlotBackfill(params: {
  stageId: number;
  stageTitle: string;
  slotKey: string;
  slotLabel: string;
  artifactSummary?: string;
  existingHint?: string;
}): Promise<{ content: string }> {
  const res = await fetch("/api/ai/slot-backfill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as { content?: string; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "백필 요청에 실패했습니다.");
  }
  if (!json.content?.trim()) {
    throw new Error("백필 내용이 비어 있습니다.");
  }
  return { content: json.content.trim() };
}

export async function requestIdeaSketchImage(params: {
  projectId: string;
  title: string;
  description?: string;
  hmwText?: string;
}): Promise<{ imageUrl: string; model?: string }> {
  const res = await fetch("/api/stage8/idea-sketch-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as {
    imageUrl?: string;
    model?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? "아이디어 스케치 생성에 실패했습니다.");
  }
  if (!json.imageUrl) {
    throw new Error("이미지 URL을 받지 못했습니다.");
  }
  return { imageUrl: json.imageUrl, model: json.model };
}

export async function requestStoryboardImage(params: {
  projectId: string;
  conceptName: string;
  cutIndex: number;
  cutCaption: string;
  userNeed?: string;
  personaContext?: string;
  isFinale?: boolean;
}): Promise<{ imageUrl: string; model?: string }> {
  const res = await fetch("/api/stage8/storyboard-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      totalCuts: 5,
    }),
  });
  const json = (await res.json()) as {
    imageUrl?: string;
    model?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? "스토리보드 이미지 생성에 실패했습니다.");
  }
  if (!json.imageUrl) {
    throw new Error("이미지 URL을 받지 못했습니다.");
  }
  return { imageUrl: json.imageUrl, model: json.model };
}

export async function requestPrototypeHtml(params: {
  projectId: string;
  conceptName: string;
  conceptDescription?: string;
  features?: string[];
  storyboardCuts?: string[];
  platform: PrototypePlatform;
  latentNeed?: string;
}): Promise<{ html: string; model?: string }> {
  const res = await fetch("/api/ai/prototype-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as {
    html?: string;
    model?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? "시제품 HTML 생성에 실패했습니다.");
  }
  if (!json.html?.trim()) {
    throw new Error("HTML을 받지 못했습니다.");
  }
  return { html: json.html, model: json.model };
}
