/**
 * CORE 3 — 주제(문제 정의)와 직결된 인터뷰 질문.
 *
 * 질문은 조사 대상별이 아니라 **테마(가이드 카테고리)별 단일 가이드**로 구성한다.
 * CORE 2에서 모집하는 대상(극단 사용자 스펙트럼)에게 같은 질문을 묻고
 * 답변 차이를 비교하는 것이 목적이므로, 대상별 질문지와 일치시킬 필요가 없다.
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
  /** (레거시) 과거 대상자별 질문 데이터 식별용 — 신규 생성은 subject 없음 */
  subject?: string;
}

/** 테마(카테고리)당 최대 질문 수 */
export const MAX_TOPIC_QUESTIONS_PER_CATEGORY = 5;
const MAX_PER_KEY_CATEGORY = MAX_TOPIC_QUESTIONS_PER_CATEGORY;
/** 5개 테마 × 최대 5개 */
const MAX_PER_KEY = MAX_TOPIC_QUESTIONS_PER_CATEGORY * 5;
const MAX_TOTAL = 80;
/** 가이드 전체 목표 질문 수 (카테고리당 최대 5 × 5테마) */
export const MIN_TOPIC_QUESTIONS_TOTAL =
  MAX_TOPIC_QUESTIONS_PER_CATEGORY * TO_KNOW_GUIDE_CATEGORY_ORDER.length;
/** 테마(카테고리)당 목표·상한 — 최대 5개까지 채움 */
const MIN_PER_CATEGORY = MAX_TOPIC_QUESTIONS_PER_CATEGORY;
/** 생성된 질문 행의 infoCategory — 모든 조사 대상에게 동일하게 묻는 가이드 */
export const TOPIC_QUESTION_SUBJECT_LABEL = "공통";

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

/** subject가 「공통」류 표기인지 — 공통 질문은 subject 없이 저장 */
function isCommonSubjectName(subject: string): boolean {
  const s = subject.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return true;
  return (
    s === "공통" ||
    s === "공통질문" ||
    s === "전체" ||
    s === "모두" ||
    s === "common" ||
    s === "all"
  );
}

function subjectKey(subject: string | undefined): string {
  return (subject ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function normalizeTopicInterviewQuestions(
  raw: unknown,
): TopicInterviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: TopicInterviewQuestion[] = [];
  const perKey = new Map<string, number>();
  const perKeyCategory = new Map<string, number>();
  const seen = new Set<string>();

  for (const item of raw) {
    if (out.length >= MAX_TOTAL) break;
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const category = resolveCategory(o.category);
    if (!category) continue;

    const rawSubject =
      typeof o.subject === "string"
        ? sanitizeCoachKoreanText(o.subject.trim()).slice(0, 60)
        : "";
    const subject = isCommonSubjectName(rawSubject) ? "" : rawSubject;
    const sKey = subjectKey(subject);
    if ((perKey.get(sKey) ?? 0) >= MAX_PER_KEY) continue;
    const scKey = `${sKey}|${category}`;
    if ((perKeyCategory.get(scKey) ?? 0) >= MAX_PER_KEY_CATEGORY) {
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

    perKey.set(sKey, (perKey.get(sKey) ?? 0) + 1);
    perKeyCategory.set(scKey, (perKeyCategory.get(scKey) ?? 0) + 1);
    out.push(
      subject ? { category, question, subject } : { category, question },
    );
  }

  // 카테고리(테마) 순서대로 정렬 (입력 순서는 카테고리 내에서 유지)
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

/** 레거시 대상자별 질문 데이터인지 (테마형 단일 가이드로 1회 재생성 대상) */
export function hasSubjectSpecificQuestions(
  questions: TopicInterviewQuestion[],
): boolean {
  return questions.some((q) => Boolean(q.subject?.trim()));
}

function categoryCounts(
  questions: TopicInterviewQuestion[],
): Map<ToKnowGuideCategory, number> {
  const counts = new Map<ToKnowGuideCategory, number>();
  for (const q of questions) {
    counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  }
  return counts;
}

/** 전체 개수 또는 테마별 개수가 최소치에 못 미치는지 */
export function hasInsufficientTopicQuestions(
  questions: TopicInterviewQuestion[],
): boolean {
  if (questions.length < MIN_TOPIC_QUESTIONS_TOTAL) return true;
  const counts = categoryCounts(questions);
  return TO_KNOW_GUIDE_CATEGORY_ORDER.some(
    (category) => (counts.get(category) ?? 0) < MIN_PER_CATEGORY,
  );
}

function clipTopic(problem: string): string {
  const t = problem.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t;
  return `${t.slice(0, 48)}…`;
}

function looksFinancialProblem(problem: string): boolean {
  return (
    /금융|자산|저축|투자|돈|월급|경제|자취|사회\s*초년/.test(problem) ||
    /finance|asset|money/.test(problem.toLowerCase())
  );
}

function baseHeuristicPool(problem: string): TopicInterviewQuestion[] {
  const p = clipTopic(problem);
  if (!p) return [];

  if (looksFinancialProblem(problem)) {
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
        category: "사용자",
        question:
          "금융 관련 정보는 주로 어디서, 어떤 계기로 찾아보나요? 최근 사례를 들어 주실 수 있나요?",
      },
      {
        category: "사용자",
        question:
          "월급·보너스·용돈 등 돈이 들어오는 경로를 최근 한 달 기준으로 어떻게 구분해서 쓰고 계신가요?",
      },
      {
        category: "사용자",
        question:
          "돈 관리를 도와주는 사람(가족·친구·동료)이 있다면, 그 사람과 어떤 역할을 나누고 계신가요?",
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
        category: "현재 문제",
        question:
          "월급을 받은 뒤 저축과 소비를 나누다가 가장 최근에 막혔던 순간은 언제, 어떻게 넘기셨나요?",
      },
      {
        category: "현재 문제",
        question:
          "예상치 못한 지출이 생겼을 때 가장 최근에 어떻게 대처하셨나요? 그때 무엇이 가장 어려웠나요?",
      },
      {
        category: "현재 문제",
        question:
          "통장·카드·앱 잔액을 확인하다가 불안하거나 피하고 싶었던 최근 순간이 있다면 언제였나요?",
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
        category: "행동 & 맥락",
        question:
          "돈 이야기를 주로 누구와 나누시나요? 최근에는 어떤 이야기를 하셨나요?",
      },
      {
        category: "행동 & 맥락",
        question:
          "결제·이체 직전에 멈추거나 다시 생각하는 습관이 있다면, 최근에는 어떤 상황에서 그렇게 하셨나요?",
      },
      {
        category: "행동 & 맥락",
        question:
          "현금·카드·간편결제 중 어디에 돈을 두고 쓰시나요? 장소·상황마다 다르게 쓰시는 방식이 있나요?",
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
        category: "기존 솔루션",
        question:
          "저축·소비 결정을 내리기 직전에 마지막으로 참고하는 정보나 기준은 무엇인가요?",
      },
      {
        category: "기존 솔루션",
        question:
          "자동이체·알림·예산 설정처럼 지금도 켜 둔 기능이 있다면 무엇이고, 왜 그걸 유지하시나요?",
      },
      {
        category: "기존 솔루션",
        question:
          "주변에서 추천받아 써 본 돈 관리 방법 중, 본인에게는 잘 안 맞았던 것이 있다면 무엇이었나요?",
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
      {
        category: "동기 & 목표",
        question:
          "돈 관리에서 「이것만은 지키고 싶다」 하는 본인만의 원칙이 있다면 무엇인가요?",
      },
      {
        category: "동기 & 목표",
        question:
          "최근 저축·투자·소비 중 하나를 미룬 적이 있다면, 그때 진짜로 지키고 싶었던 목표는 무엇이었나요?",
      },
      {
        category: "동기 & 목표",
        question:
          "돈 걱정이 덜해졌다고 느끼는 순간이 있다면, 그때 무엇이 달라져 있었나요?",
      },
    ];
  }

  return [
    {
      category: "사용자",
      question: `하루 중 「${p}」 상황을 가장 자주 만나는 순간은 언제이고, 그때 무엇을 하고 계셨나요?`,
    },
    {
      category: "사용자",
      question: `「${p}」와 관련해 본인이 중요하게 여기는 우선순위(시간·돈·에너지)는 무엇인가요?`,
    },
    {
      category: "사용자",
      question: `「${p}」 상황을 얼마나 자주 겪으시나요? 가장 최근은 언제였나요?`,
    },
    {
      category: "사용자",
      question: `「${p}」와 관련해 주로 함께하는 사람이나 역할(가족·동료·서비스)이 있다면 누구인가요?`,
    },
    {
      category: "사용자",
      question: `「${p}」를 겪을 때 본인을 어떤 유형의 사람이라고 느끼시나요? 최근 예로 말씀해 주실 수 있나요?`,
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
      category: "현재 문제",
      question: `「${p}」를 평소 어떤 말이나 표현으로 이야기하시나요? 최근 누구에게 어떻게 말했나요?`,
    },
    {
      category: "현재 문제",
      question: `「${p}」가 반복될 때 가장 먼저 포기하거나 미루게 되는 부분은 무엇인가요?`,
    },
    {
      category: "현재 문제",
      question: `「${p}」 때문에 예상과 달랐던 최근 결과는 무엇이었고, 그때 어떻게 받아들이셨나요?`,
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
      category: "행동 & 맥락",
      question: `「${p}」 전·중·후로 곁에 있는 사람·도구·환경은 어떻게 달라지나요?`,
    },
    {
      category: "행동 & 맥락",
      question: `「${p}」 직전에 습관적으로 확인하는 정보나 화면·메모가 있다면 무엇인가요?`,
    },
    {
      category: "행동 & 맥락",
      question: `「${p}」가 일어나는 장소·시간대는 보통 언제이고, 그때 주변 상황은 어떤가요?`,
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
      category: "기존 솔루션",
      question: `「${p}」와 관련한 선택을 하기 직전에 마지막으로 참고하는 정보나 기준은 무엇인가요?`,
    },
    {
      category: "기존 솔루션",
      question: `「${p}」를 위해 예전에 시도했다가 그만둔 방법이 있다면, 어떤 순간에 왜 그만두셨나요?`,
    },
    {
      category: "기존 솔루션",
      question: `주변에서 추천받은 「${p}」 관련 방법 중 본인에게 안 맞았던 것이 있다면 무엇이었나요?`,
    },
    {
      category: "동기 & 목표",
      question: `「${p}」가 해결된다면 일상이 구체적으로 어떻게 달라질 것 같나요?`,
    },
    {
      category: "동기 & 목표",
      question: `「${p}」와 관련해 말로는 잘 안 꺼내지만 은근히 바라시는 것이 있다면 무엇인가요?`,
    },
    {
      category: "동기 & 목표",
      question: `「${p}」에서 「이것만은 지키고 싶다」 하는 본인만의 원칙이 있다면 무엇인가요?`,
    },
    {
      category: "동기 & 목표",
      question: `「${p}」를 미뤘던 최근 경험이 있다면, 그때 진짜로 지키고 싶었던 목표는 무엇이었나요?`,
    },
    {
      category: "동기 & 목표",
      question: `「${p}」 걱정이 덜해졌다고 느낀 순간이 있다면, 그때 무엇이 달라져 있었나요?`,
    },
  ];
}

/** AI 없이도 주제 소재가 질문 안에 들어가도록 하는 테마별 폴백 (카테고리당 최대 5개) */
export function heuristicTopicInterviewQuestions(
  problem: string,
): TopicInterviewQuestion[] {
  return normalizeTopicInterviewQuestions(baseHeuristicPool(problem));
}

/**
 * AI가 적게 낸 질문을 테마별 최대(5개)까지 보충.
 * 기존(AI) 질문은 유지하고, 모자란 테마 위주로 휴리스틱을 채운다.
 * 결과는 항상 subject 없는 테마형 단일 가이드가 된다.
 */
export function ensureTopicQuestionsCoverage(
  problem: string,
  existing: TopicInterviewQuestion[],
): TopicInterviewQuestion[] {
  let merged = normalizeTopicInterviewQuestions(
    existing.map(({ category, question }) => ({ category, question })),
  );
  if (!hasInsufficientTopicQuestions(merged)) return merged;

  const fillers = heuristicTopicInterviewQuestions(problem);
  const seen = new Set(merged.map((q) => q.question.replace(/\s+/g, "")));

  // 부족한 테마 우선으로 최대 개수까지 보충
  const ordered = [...fillers].sort((a, b) => {
    const counts = categoryCounts(merged);
    return (counts.get(a.category) ?? 0) - (counts.get(b.category) ?? 0);
  });

  for (const filler of ordered) {
    if (!hasInsufficientTopicQuestions(merged)) break;
    const key = filler.question.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    const counts = categoryCounts(merged);
    const current = counts.get(filler.category) ?? 0;
    if (current >= MAX_PER_KEY_CATEGORY) continue;
    const needsCategory = current < MIN_PER_CATEGORY;
    const needsTotal = merged.length < MIN_TOPIC_QUESTIONS_TOTAL;
    if (!needsCategory && !needsTotal) continue;
    seen.add(key);
    merged = [...merged, filler];
  }

  return normalizeTopicInterviewQuestions(merged);
}

export function buildTopicToKnowRows(
  questions: TopicInterviewQuestion[],
): ToKnowRow[] {
  // 레거시 대상자별 데이터가 섞여 있어도 같은 문항은 한 번만 표에 올린다
  const seen = new Set<string>();
  const rows: ToKnowRow[] = [];
  for (const item of questions) {
    const key = item.question.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const { big, method } = defaultsForCategory(item.category);
    rows.push({
      id: newRowId(`${item.category}-topic`),
      big,
      mid: item.category,
      rowKind: "info",
      infoCategory: TOPIC_QUESTION_SUBJECT_LABEL,
      small: item.question,
      method,
      note: "",
    });
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
): ToKnowRow[] {
  if (!questions.length) return existing;
  return buildTopicToKnowRows(questions);
}
