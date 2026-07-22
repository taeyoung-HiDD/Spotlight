import { PRE_PMF_WRITING_TONE_RULE } from "@/lib/stages/stage2/prePmfOverview";
import { DT_PROBLEM_STATEMENT_WRITING_RULE } from "@/lib/stages/problemStatement";
import { getSidebarStage } from "@/lib/stages/sidebarNav";

function nextActivityStageCatalog(): string {
  const lines: string[] = [];
  for (let id = 3; id <= 11; id++) {
    const label = getSidebarStage(id)?.navLabel ?? `단계 ${id}`;
    lines.push(`${id}: ${label}`);
  }
  return lines.join("\n");
}

/**
 * Deep Research 에이전트에 전달할 사전 조사(Pre-PMF) 지시문.
 * Deep Research는 구조화 출력(JSON)을 지원하지 않으므로, 한국어 보고서를
 * 섹션 헤더로 명확히 구분해 요청한 뒤 후속 단계에서 우리 스키마로 정리한다.
 */
export function buildPrePmfDeepResearchPrompt(problem: string): string {
  return `
당신은 예비 창업자를 돕는 창업 코치의 사전 조사(Pre-Product Market Fit) 애널리스트입니다.
아래 1단계 입력(사용자 문제·초기 아이디어)을 기준으로, 시장 적합성을 사전 점검하는 조사 보고서를 한국어로 작성하세요.
웹을 검색해 실제 출처·수치를 근거로 삼고, 한국 시장 맥락을 우선 고려하세요.

[1단계 입력 (사용자 문제·초기 아이디어)]
${problem.slice(0, 2500) || "(미입력 — 입력이 비어 있으면 일반적인 초기 아이디어 점검 관점으로 작성하세요)"}

[보고서 구성] 아래 번호 섹션을 모두 한국어 마크다운 헤더(## )로 작성하세요.
## 1. 문제 정의 (Design Thinking Problem Statement · POV)
## 2. 예상 타겟 사용자 (문제를 직접 겪는 3~5개 세그먼트, 각 특성·상황·타겟인 이유)
## 3. 이해관계자 (주 사용자가 아닌 운영·공급·규제·플랫폼 등 3~5 주체, 역할·관련 이유)
## 4. 산업·실물 경제 (문제·아이디어 뒤에 깔린 오프라인 산업 — 국내 구조·규모·트렌드)
## 5. 디지털·서비스 시장 규모·성장률 (앱·플랫폼·온라인 서비스 시장, 수치·연도 포함)
## 6. 경쟁 현황 (경쟁사·대안과 차별·시장 공백)
## 7. 유사 서비스 (글로벌·한국 포함 최대 3개, 각 한 줄 설명)
## 8. 비즈니스 모델 가설 (수익 모델 후보)
## 9. 다음 활동 제안 (아래 워크북 단계 3~11 중 3~5개, "단계번호: 그 단계에서 할 구체 과제" 형식)

[워크북 단계 카탈로그 — 9번 섹션에서 이 번호만 사용]
${nextActivityStageCatalog()}

[작성 규칙]
- 1번 문제 정의 섹션은 Design Thinking Approach Problem Statement(POV) 원칙을 따르세요.
${DT_PROBLEM_STATEMENT_WRITING_RULE}
- 각 요점은 한 줄로 끊어 쓰세요.
${PRE_PMF_WRITING_TONE_RULE}
- 특정 수치를 찾지 못하면 추정·미상임을 명시하고 임의로 지어내지 마세요.
- 본문에는 URL·출처명·(출처: …) 표기를 넣지 마세요. 출처는 서비스가 별도 링크로 표시합니다.
`.trim();
}

/**
 * Deep Research 보고서(자유 서술)를 Pre-PMF Overview JSON 스키마로 정리하는 지시문.
 * 일반 generateContent(JSON 모드)로 호출한다.
 */
export function buildPrePmfStructurePrompt(
  problem: string,
  report: string,
): string {
  return `
아래는 한 아이디어에 대한 사전 조사(Deep Research) 보고서입니다. 이 보고서 내용만을 근거로,
지정한 JSON 스키마에 맞춰 한국어 Pre-PMF Overview를 정리하세요. 보고서에 없는 사실을 새로 지어내지 마세요.

[1단계 입력]
${problem.slice(0, 1500) || "(미입력)"}

[Deep Research 보고서]
${report.slice(0, 18000)}

반드시 아래 JSON 스키마로만 응답하세요 (코드블록·설명 없이 JSON 객체만):
{
  "problemStatement": "문제 정의(POV) — 각 요점을 줄바꿈하고 줄마다 · 로 시작. 사용자·맥락·니즈·인사이트, 솔루션 없음",
  "targetUsers": [{"name": "세그먼트·역할명", "reason": "한 문장 프로필"}],
  "industryLandscape": "· 실물·오프라인 산업 구조·규모·트렌드\\n· 국내 산업 형성·주요 플레이어·소비 흐름(출처·URL 없이)",
  "marketSize": "· 디지털·서비스 시장 범위(국내·세그먼트)\\n· 시장 규모·성장률\\n· 최근 2~3년 흐름·트렌드 변화\\n· 앞으로 방향 한 줄(출처·URL 없이)",
  "marketStats": [{"label": "지표명(예: 국내 XX 시장 규모)", "value": "수치(예: 1.2조 원)", "source": "출처: OO리포트, 2026"}],
  "competitiveLandscape": "· 경쟁사·대안 한 줄씩\\n· 차별·공백 한 줄(출처·URL 없이)",
  "similarServices": [{"name": "서비스명", "region": "global", "note": "한 줄 설명", "url": "https://..."}],
  "businessModel": "· 수익 가설 한 줄씩",
  "nextSteps": [{"stageId": 3, "description": "해당 단계에서 할 구체 과제 한 줄"}]
}

워크북 단계·활동 목록 (stageId는 아래 번호만 사용):
${nextActivityStageCatalog()}

규칙:
${DT_PROBLEM_STATEMENT_WRITING_RULE}
- problemStatement, marketSize, competitiveLandscape, businessModel은 한 문단으로 이어 쓰지 말고 줄바꿈(\\n)으로 나누고 각 줄은 · 로 시작하세요.
- targetUsers는 **주 사용 고객(문제를 직접 겪는 사람)** 2~4개 세그먼트입니다. reason은 **불릿 없이 한 문장** 프로필만 씁니다 (예: 예비 창업가 — 혁신적 아이디어는 있지만 사업화 경험이 부족하고 구체화를 원함).
- targetUsers name은 역할·세그먼트 라벨만(예: 예비 창업가, 20대 직장인). 운영·공급·규제 주체(이해 관계자)는 넣지 마세요. 특성·욕구 문장 조각은 reason에만 씁니다.
- 한 줄에 하나의 요점만 쓰세요.
- industryLandscape는 **렌즈2 산업·실물 경제**용입니다. 오프라인·실물 산업이 국내에서 어떻게 형성돼 있는지 **·** 한 줄씩 씁니다.
- marketSize는 **렌즈2 디지털·서비스 시장**용입니다. 앱·플랫폼·온라인 서비스 시장의 범위·규모·성장·트렌드를 **·** 한 줄씩 씁니다.
- marketStats는 **렌즈2** 보조 지표 카드 3~6개. 산업·서비스 시장 규모·성장률·도메인 관련 지표를 포함하세요.
- industryLandscape, marketSize, competitiveLandscape, businessModel 본문에는 URL·출처명·(출처: …)를 넣지 마세요.
- similarServices는 글로벌(global)과 한국(korea) 사례를 region 값으로 구분하고, **최대 3개**까지 넣으세요. 각 항목에 url을 넣으세요.
- nextSteps의 stageId는 반드시 위 목록(3~11)의 번호입니다.
- ${PRE_PMF_WRITING_TONE_RULE}
`.trim();
}
