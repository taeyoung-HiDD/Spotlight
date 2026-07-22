export function formatGroqError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429") || message.toLowerCase().includes("rate")) {
    return "Groq API 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (message.includes("401") || message.toLowerCase().includes("api key")) {
    return "GROQ_API_KEY가 유효하지 않습니다. Groq Console에서 키를 확인해 .env.local에 저장한 뒤 `npm run dev`를 다시 실행해 주세요.";
  }
  if (message.includes("404") && message.toLowerCase().includes("model")) {
    return "지정한 Groq 모델을 사용할 수 없습니다. GROQ_TEXT_MODEL 환경 변수를 확인해 주세요.";
  }
  return "AI 응답을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function formatImageGenerateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate")) {
    return "이미지 API 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (
    lower.includes("403") ||
    lower.includes("401") ||
    lower.includes("api key") ||
    lower.includes("unauthorized")
  ) {
    return "GEMINI_API_KEY가 유효하지 않습니다. Google AI Studio에서 키를 확인해 주세요.";
  }
  return "이미지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** @deprecated formatImageGenerateError 사용 */
export function formatGeminiImageError(error: unknown): string {
  return formatImageGenerateError(error);
}
