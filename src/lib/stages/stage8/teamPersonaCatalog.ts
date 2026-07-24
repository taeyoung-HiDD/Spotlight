export type TeamPersonaId = "minho" | "jiwon" | "hyunwoo";

export interface TeamPersonaPrompt {
  id: string;
  persona: TeamPersonaId;
  name: string;
  role: string;
  /** 질문만 — 답 생성 금지 */
  question: string;
}

export const TEAM_PERSONA_PROMPTS: TeamPersonaPrompt[] = [
  {
    id: "tp-minho-money",
    persona: "minho",
    name: "민호",
    role: "CEO",
    question: "이걸로 어떻게 돈을 벌지?",
  },
  {
    id: "tp-jiwon-feel",
    persona: "jiwon",
    name: "지원",
    role: "편집·UX",
    question: "사장님이 이걸 처음 봤을 때 뭘 느낄까?",
  },
  {
    id: "tp-hyunwoo-simple",
    persona: "hyunwoo",
    name: "현우",
    role: "개발",
    question: "가장 단순하게 만들면 어떤 모습일까?",
  },
];
