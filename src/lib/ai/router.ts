import type { AiTask } from "@/lib/ai/types";

/** 태스크별 프로바이더 — 이미지·멀티모달(오디오)·Pre-PMF는 Gemini, 나머지 텍스트는 Groq */
export function providerFor(task: AiTask): "groq" | "gemini" {
  switch (task) {
    case "storyboard_image":
    case "research_debrief":
    case "research_audio":
    case "pre_pmf_overview":
    case "pre_pmf_followup":
      return "gemini";
    default:
      return "groq";
  }
}
