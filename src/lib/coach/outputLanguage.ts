import { hasDisallowedForeignScript } from "@/lib/coach/sanitizeCoachKorean";
import type { UiLocale } from "@/lib/i18n/uiLocale";

const HANGUL = /[\uac00-\ud7a3]/;

export type LanguageSubjectHint = {
  name?: string;
  context?: string;
};

function hasHangul(text: string): boolean {
  return HANGUL.test(text);
}

export function hasDisallowedOutputScript(text: string): boolean {
  return hasDisallowedForeignScript(text);
}

/** 이름·맥락에 한글이 있으면 한국인 조사 대상으로 본다 */
export function subjectLooksKorean(subject: LanguageSubjectHint): boolean {
  return hasHangul(subject.name ?? "") || hasHangul(subject.context ?? "");
}

/**
 * UI가 한국어이고, 조사 대상·리서치 텍스트가 한국 맥락이면
 * 산출물은 한국어(+필요한 영어 용어)만 쓰도록 강제한다.
 */
export function shouldEnforceKoreanPrimaryOutput(options: {
  locale: UiLocale;
  subjects?: LanguageSubjectHint[];
  sampleTexts?: string[];
}): boolean {
  if (options.locale !== "ko") return false;

  const subjects = options.subjects ?? [];
  if (subjects.length > 0) {
    const koreanSubjects = subjects.filter(subjectLooksKorean).length;
    if (koreanSubjects >= Math.ceil(subjects.length / 2)) return true;
  }

  const samples = (options.sampleTexts ?? []).filter((t) => t.trim());
  if (samples.length > 0) {
    const koreanSamples = samples.filter(hasHangul).length;
    return koreanSamples >= Math.ceil(samples.length / 2);
  }

  // 한국어 UI로 시작했고 외국인 단서가 없으면 기본은 한국어 산출
  return subjects.length === 0 || subjects.every(subjectLooksKorean);
}

/**
 * 한국어 우선 산출로 허용되는 텍스트인지.
 * - 키릴·한자 등 금지 문자 없음
 * - 한글이 최소 1자 이상 (영어만인 문장 거부)
 */
export function isAcceptableKoreanPrimaryText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (hasDisallowedForeignScript(trimmed)) return false;
  if (!hasHangul(trimmed)) return false;
  return true;
}

/** AI 프롬프트에 넣는 한국어 우선 산출 규칙 */
export const KOREAN_PRIMARY_OUTPUT_RULE = `
[언어 — 필수]
- 이 프로젝트는 한국어 UI이며 조사 대상은 한국인(또는 한국어 리서치)입니다.
- 모든 산출 문장은 **한국어(한글)** 로 작성하세요. 영어는 전문 용어·고유명사만 짧게 섞을 수 있습니다 (예: Latent Needs, Need Statement, HMW).
- 러시아어·키릴·중국어·일본어·한자 등 다른 문자로 작성하면 안 됩니다.
- 문장 전체가 영어만으로 되어도 안 됩니다. 반드시 한글이 본문의 중심이어야 합니다.
`.trim();
