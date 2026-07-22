/**
 * 잠재 니즈 → HMW 초안 (오프라인·폴백)
 * 형식: 「어떻게 하면 ~하기 위해 ~할 수 있을까?」
 * — 목적·제약(왜) + 구체 상태·행동(무엇을)을 함께 담아
 *   아이디어 단계에서 솔루션을 떠올릴 수 있게 한다.
 *
 * AI 생성(메인 경로)이 실패할 때만 쓰이므로, 자연스러운 한국어보다
 * 「목적 + 결과」 구조를 보장하는 쪽을 우선한다.
 */

function ensureQuestionMark(text: string): string {
  const t = text.trim();
  if (!t) return "";
  return t.endsWith("?") || t.endsWith("？") ? t : `${t}?`;
}

function stripWantSuffix(text: string): string {
  return text
    .replace(/(하고|하기)\s*싶(다|어요|습니다|음)?$/u, "")
    .replace(/(하려고|하기를)\s*(한다|해요|합니다|원함)?$/u, "")
    .trim();
}

function stripLeadingLabel(text: string): string {
  return text.replace(/^(잠재\s*니즈|니즈)\s*[:：]\s*/u, "").trim();
}

function stripHadaStem(text: string): string {
  return text.replace(/하기$/u, "").trim();
}

/** 결과 절을 「~할 수 있을까」로 마무리 */
function withCanEnding(outcome: string): string {
  let o = stripHadaStem(outcome).replace(/고$/u, "").trim();
  if (!o) return "";
  if (/할$/u.test(o)) return `${o} 수 있을까`;
  // 「알·보·듣」 등 순수 동사 어간
  if (
    /(?:알|보|듣|찾|가|오|주|받|쓰|읽|먹|살|서|앉|걷|뛰|날|울|웃|쉬|자|깨|열|닫|팔|사|만드)$/u.test(
      o,
    )
  ) {
    return `${o} 수 있을까`;
  }
  return `${o}할 수 있을까`;
}

function formatHmw(purpose: string, outcome: string): string {
  const p = stripHadaStem(purpose);
  const outcomeClause = withCanEnding(outcome);
  if (!p || !outcomeClause) return "";

  if (/없이$/u.test(p)) {
    return ensureQuestionMark(`어떻게 하면 ${p}도 ${outcomeClause}`);
  }
  if (/위해$/u.test(p)) {
    return ensureQuestionMark(`어떻게 하면 ${p} ${outcomeClause}`);
  }
  return ensureQuestionMark(`어떻게 하면 ${p}하기 위해 ${outcomeClause}`);
}

/** 「A하기 위해서 B하고 싶다」 */
function parseIcebergNeed(
  need: string,
): { purpose: string; outcome: string } | null {
  const m = need.match(/^(.+?)\s*하기\s*위해서?\s+(.+)$/u);
  if (!m?.[1] || !m[2]) return null;
  const purpose = m[1].trim();
  const outcome = stripWantSuffix(m[2]);
  if (!purpose || !outcome) return null;
  return { purpose, outcome };
}

/**
 * 「A고 B하고 싶다」 — 앞을 결과(무엇을), 뒤를 목적(왜).
 * 「알고」의 연결어미 고는 앞 절에 남기고 withCanEnding이 정리한다.
 */
function parseLinkedNeed(
  need: string,
): { purpose: string; outcome: string } | null {
  const core = stripWantSuffix(need);
  const m = core.match(/^(.+?)고\s+(.+)$/u);
  if (!m?.[1] || !m[2]) return null;
  const outcome = m[1].trim();
  const purpose = m[2].trim();
  if (outcome.length < 2 || purpose.length < 2) return null;
  return { purpose, outcome };
}

export function needToHmwDraft(need: string): string {
  const trimmed = need.trim().replace(/[.!?…]+$/u, "");
  if (!trimmed) return "";

  if (/^(어떻게|how)/i.test(trimmed)) {
    return ensureQuestionMark(trimmed);
  }

  const cleaned = stripLeadingLabel(trimmed);
  const body = stripWantSuffix(cleaned);

  const iceberg = parseIcebergNeed(cleaned);
  if (iceberg) return formatHmw(iceberg.purpose, iceberg.outcome);

  // 이미 「~하기 위해 ~」면 목적·결과로 분리해 포맷
  const forMatch = body.match(/^(.+?)\s*하기\s*위해\s+(.+)$/u);
  if (forMatch?.[1] && forMatch[2]) {
    return formatHmw(forMatch[1], forMatch[2]);
  }

  // 「~없이 ~」 제약이 이미 있으면 목적·결과로 분리
  const withoutMatch = body.match(/^(.+?없이)\s+(.+)$/u);
  if (withoutMatch?.[1] && withoutMatch[2]) {
    return formatHmw(withoutMatch[1], withoutMatch[2]);
  }

  const linked = parseLinkedNeed(cleaned);
  if (linked) return formatHmw(linked.purpose, linked.outcome);

  // 목적·결과 분리가 안 되면, 니즈를 결과로 두고 부가 요청을 줄이는 조건을 목적으로 둔다
  return formatHmw("부가적인 요청 없이", body || cleaned);
}
