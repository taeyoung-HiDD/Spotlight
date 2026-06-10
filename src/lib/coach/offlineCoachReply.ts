import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";

type OfflineContext = {
  stageTitle?: string;
  stageBehaviorNote?: string;
};

/** GROQ_API_KEY 없을 때 — 오류 대신 짧은 코치 안내 */
export function buildOfflineCoachReply(
  message: string,
  context?: OfflineContext,
): string {
  const stage = context?.stageTitle?.trim() || "이 단계";
  const heard = message.trim().slice(0, 200);
  const heardLine = heard
    ? `말씀하신 「${heard}${message.trim().length > 200 ? "…" : ""}」은 왼쪽 작업 영역에 직접 반영해 주세요.`
    : "내용은 왼쪽 작업 영역에서 직접 수정·입력해 주세요.";

  const blocks = [
    `지금은 AI 코치(Groq) 연결이 없어서 ${stage}에서 자유 대화 응답을 생성하지 못해요.`,
    heardLine,
    context?.stageBehaviorNote?.trim()
      ? `${context.stageBehaviorNote.trim()}`
      : "표·카드·입력란을 보면서 진행해 주세요.",
    "AI 코치를 쓰려면 Groq Console에서 API 키를 발급한 뒤, 프로젝트 루트 `.env.local`에 GROQ_API_KEY=키값 을 넣고 `npm run dev`를 다시 실행해 주세요. (스토리보드 이미지는 GEMINI_API_KEY도 필요합니다.)",
  ];

  return formatCoachDialogBreaks(blocks.join("\n\n"));
}
