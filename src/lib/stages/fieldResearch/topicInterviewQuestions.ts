/**
 * CORE 3 — 주제(문제 정의)와 직결된 인터뷰 질문.
 * AI/휴리스틱이 생성한 topicQuestions를 To-know 표(대상자별 확인 질문)로 반영한다.
 */

import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import {
  defaultsForCategory,
  TO_KNOW_GUIDE_CATEGORY_ORDER,
  type ToKnowGuideCategory,
} from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import type { ToKnowRow } from "@/lib/stages/fieldResearch/types";

export interface TopicInterviewQuestion {
  category: ToKnowGuideCategory;
  question: string;
  /** 이 질문을 물어볼 조사 대상자 (없으면 모든 대상자 공용) */
  subject?: string;
}

const MAX_PER_SUBJECT_CATEGORY = 4;
const MAX_PER_SUBJECT = 14;
const MAX_TOTAL = 48;

function newRowId(prefix: string): string {
  return `tok-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 띄어쓰기·구두점 변형(행동&맥락 등)을 표준 카테고리명으로 */
function resolveCategory(raw: unknown): ToKnowGuideCategory | null {
  if (typeof raw !== "string") return null;
  const compact = raw.trim().replace(/\s+/g, "").replace(/[&＆]/g, "&");
  for (const category of TO_KNOW_GUIDE_CATEGORY_ORDER) {
    if (category.replace(/\s+/g, "") === compact) return category;
  }
  return null;
}

function subjectKey(subject: string | undefined): string {
  return (subject ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function normalizeTopicInterviewQuestions(
  raw: unknown,
): TopicInterviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: TopicInterviewQuestion[] = [];
  const perSubject = new Map<string, number>();
  const perSubjectCategory = new Map<string, number>();
  const seen = new Set<string>();

  for (const item of raw) {
    if (out.length >= MAX_TOTAL) break;
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const category = resolveCategory(o.category);
    if (!category) continue;

    const subject =
      typeof o.subject === "string"
        ? sanitizeCoachKoreanText(o.subject.trim()).slice(0, 60)
        : "";
    const sKey = subjectKey(subject);
    if ((perSubject.get(sKey) ?? 0) >= MAX_PER_SUBJECT) continue;
    const scKey = `${sKey}|${category}`;
    if ((perSubjectCategory.get(scKey) ?? 0) >= MAX_PER_SUBJECT_CATEGORY) {
      continue;
    }

    let question =
      typeof o.question === "string"
        ? sanitizeCoachKoreanText(o.question.trim()).slice(0, 200)
        : "";
    if (question.length < 8) continue;
    if (!/[?？]$/.test(question)) question = `${question}?`;

    const key = `${sKey}|${question.replace(/\s+/g, "")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    perSubject.set(sKey, (perSubject.get(sKey) ?? 0) + 1);
    perSubjectCategory.set(scKey, (perSubjectCategory.get(scKey) ?? 0) + 1);
    out.push(
      subject ? { category, question, subject } : { category, question },
    );
  }

  // 카테고리 순서대로 정렬 (입력 순서는 카테고리 내에서 유지)
  const order = new Map(TO_KNOW_GUIDE_CATEGORY_ORDER.map((c, i) => [c, i]));
  return out
    .map((q, index) => ({ q, index }))
    .sort((a, b) => {
      const oa = order.get(a.q.category) ?? 99;
      const ob = order.get(b.q.category) ?? 99;
      if (oa !== ob) return oa - ob;
      return a.index - b.index;
    })
    .map(({ q }) => q);
}

/** AI가 돌려준 subject 표기가 대상자 라벨과 조금 달라도 매칭 */
function subjectMatches(questionSubject: string, subject: string): boolean {
  const a = subjectKey(questionSubject);
  const b = subjectKey(subject);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** 대상자별로 배정할 질문 — 전용 질문 우선, 없으면 공용(subject 없음) → 전체 순 폴백 */
export function questionsForSubject(
  questions: TopicInterviewQuestion[],
  subject: string,
): TopicInterviewQuestion[] {
  const own = questions.filter(
    (q) => q.subject && subjectMatches(q.subject, subject),
  );
  if (own.length) return own;
  const shared = questions.filter((q) => !q.subject);
  if (shared.length) return shared;
  return questions;
}

/** 대상자 전용 질문이 있는지 (대상자별 분화 여부 판단) */
export function hasSubjectSpecificQuestions(
  questions: TopicInterviewQuestion[],
): boolean {
  return questions.some((q) => Boolean(q.subject?.trim()));
}

function clipTopic(problem: string): string {
  const t = problem.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t;
  return `${t.slice(0, 48)}…`;
}

/** AI 없이도 주제 소재가 질문 안에 들어가도록 하는 폴백 */
export function heuristicTopicInterviewQuestions(
  problem: string,
): TopicInterviewQuestion[] {
  const p = clipTopic(problem);
  if (!p) return [];

  const looksFinancial =
    /금융|자산|저축|투자|돈|월급|경제|자취|사회\s*초년/.test(problem) ||
    /finance|asset|money/.test(problem.toLowerCase());

  if (looksFinancial) {
    return [
      {
        category: "사용자",
        question:
          "가장 최근 월급을 받았을 때, 실제로 돈을 어떻게 나눠 쓰셨는지 순서대로 말씀해 주실 수 있나요?",
      },
      {
        category: "사용자",
        question:
          "한 달 생활비 중 가장 먼저 빠져나가는 항목은 무엇이고, 그다음 우선순위는 어떻게 정하시나요?",
      },
      {
        category: "현재 문제",
        question:
          "돈 관리 때문에 가장 막막했던 최근 순간은 언제였나요? 그때 어떤 감정이 들었나요?",
      },
      {
        category: "현재 문제",
        question:
          "저축이나 투자를 시작해야겠다고 느꼈지만 실제로 못 했던 경험이 있다면, 무엇이 발목을 잡았나요?",
      },
      {
        category: "행동 & 맥락",
        question:
          "월급이 들어온 날부터 다음 월급 전까지, 돈과 관련해 실제로 하시는 행동을 순서대로 들려주실 수 있나요?",
      },
      {
        category: "행동 & 맥락",
        question:
          "가계부·뱅킹 앱·엑셀 등 직접 만들어 쓰시는 돈 관리 방법이 있다면 어떻게 쓰고 계신가요?",
      },
      {
        category: "기존 솔루션",
        question:
          "지금 쓰시는 금융 앱·서비스는 무엇이고, 계속 쓰는 이유와 아쉬운 점은 각각 무엇인가요?",
      },
      {
        category: "기존 솔루션",
        question:
          "예전에 가계부나 저축 챌린지 등을 시도했다 그만두신 적이 있다면, 어떤 순간에 왜 그만두셨나요?",
      },
      {
        category: "동기 & 목표",
        question:
          "돈 관리가 자리 잡는다면 1년 뒤 어떤 모습이길 바라시나요? 그게 왜 중요한가요?",
      },
      {
        category: "동기 & 목표",
        question:
          "부모님이나 또래와 돈 이야기를 할 때, 말로는 안 꺼내지만 속으로 바라시는 것이 있다면 무엇인가요?",
      },
    ];
  }

  return [
    {
      category: "사용자",
      question: `하루 중 「${p}」 상황을 가장 자주 만나는 순간은 언제이고, 그때 무엇을 하고 계셨나요?`,
    },
    {
      category: "현재 문제",
      question: `「${p}」 문제를 처음 겪으셨던 계기나 상황은 어떤 모습이었나요?`,
    },
    {
      category: "현재 문제",
      question: `최근 「${p}」 때문에 가장 답답했던 순간은 언제, 어떤 상황이었나요? 그때 감정은 어땠나요?`,
    },
    {
      category: "행동 & 맥락",
      question: `「${p}」 상황이 생기면 실제로 어떤 행동을 순서대로 하시나요? 최근 사례로 들려주실 수 있나요?`,
    },
    {
      category: "행동 & 맥락",
      question: `「${p}」를 넘기려고 스스로 만드신 우회 방법이나 임시방편이 있다면 무엇인가요?`,
    },
    {
      category: "기존 솔루션",
      question: `「${p}」를 해결하려고 지금 쓰시는 방법·서비스는 무엇이고, 계속 쓰시는 이유는 무엇인가요?`,
    },
    {
      category: "기존 솔루션",
      question: `그 방법이 「${p}」에서 채워 주지 못해 아쉬웠던 최근 순간은 언제였나요?`,
    },
    {
      category: "동기 & 목표",
      question: `「${p}」가 해결된다면 일상이 구체적으로 어떻게 달라질 것 같나요?`,
    },
    {
      category: "동기 & 목표",
      question: `「${p}」와 관련해 말로는 잘 안 꺼내지만 은근히 바라시는 것이 있다면 무엇인가요?`,
    },
  ];
}

/** 기존 표의 대상자(infoCategory) 순서를 유지해 주제 질문을 배정할 대상 목록 */
export function resolveTopicQuestionSubjects(
  rows: ToKnowRow[],
  fallbackSubjects: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  for (const row of rows) {
    if (row.rowKind === "core") continue;
    push(row.infoCategory ?? "");
  }
  if (!out.length) for (const name of fallbackSubjects) push(name);
  if (!out.length) push("목표 사용자");
  return out.slice(0, 4);
}

export function buildTopicToKnowRows(
  questions: TopicInterviewQuestion[],
  subjects: string[],
): ToKnowRow[] {
  const rows: ToKnowRow[] = [];
  for (const subject of subjects) {
    for (const item of questionsForSubject(questions, subject)) {
      const { big, method } = defaultsForCategory(item.category);
      rows.push({
        id: newRowId(`${item.category}-topic`),
        big,
        mid: item.category,
        rowKind: "info",
        infoCategory: subject,
        small: item.question,
        method,
        note: "",
      });
    }
  }
  return rows;
}

/**
 * 주제 질문으로 To-know 표 교체.
 * 템플릿 시드와 사용자 행을 저장 형식상 구분할 수 없어, 추천 재생성 시 전체를 교체한다.
 */
export function applyTopicQuestionsToToKnowTable(
  existing: ToKnowRow[],
  questions: TopicInterviewQuestion[],
  subjects: string[],
): ToKnowRow[] {
  if (!questions.length) return existing;
  return buildTopicToKnowRows(questions, subjects);
}
