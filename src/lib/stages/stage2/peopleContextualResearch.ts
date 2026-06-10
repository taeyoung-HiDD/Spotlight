import type {
  ContextualDimensionAnswers,
  ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import { parseProfileItem } from "@/lib/stages/stage2/peopleFindingsPresentation";
import { buildDimensionGuidelinePrompt } from "@/lib/stages/stage2/contextualResearchGuidelines";
import { sanitizeContextualFindings } from "@/lib/stages/stage2/sanitizeContextualFindings";

export const PEOPLE_CONTEXTUAL_DIMENSIONS = [
  "primary_users",
  "stakeholders",
] as const satisfies readonly ContextualDimensionId[];

export type PeopleContextualDimensionId =
  (typeof PEOPLE_CONTEXTUAL_DIMENSIONS)[number];

export function isPeopleContextualDimension(
  id: ContextualDimensionId,
): id is PeopleContextualDimensionId {
  return (PEOPLE_CONTEXTUAL_DIMENSIONS as readonly string[]).includes(id);
}

type ProblemDomain = "cafe" | "app" | "public" | "generic";

function inferProblemDomain(problem: string): ProblemDomain {
  const t = problem.trim();
  if (/(카페|커피|음료|매장|손님|주문|브런치|외식|식당)/u.test(t)) return "cafe";
  if (/(앱|서비스|플랫폼|검색|지도|리뷰|예약|배달|SaaS)/iu.test(t)) return "app";
  if (/(병원|의료|교육|학교|공공|행정|민원)/u.test(t)) return "public";
  return "generic";
}

function clipProblem(problem: string, max = 120): string {
  const t = problem.trim();
  if (!t) return "(1단계 미입력)";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function mergeUserItems(
  answers: ContextualDimensionAnswers,
  dimensionId: PeopleContextualDimensionId,
): string[] {
  return answers[dimensionId] ?? [];
}

/** 이해 관계자 조사 시 주 사용자와 겹치지 않게 비교할 세그먼트 라벨 */
export function extractPrimaryUserSegmentLabels(findings: string): string[] {
  const sections = parsePeopleFindingsSections(findings);
  const profiles = sections.find((s) => /누구인지|프로필/u.test(s.title));
  if (!profiles) return [];
  return profiles.items
    .map((item) => parseProfileItem(item).segment.trim())
    .filter((s) => s.length >= 2);
}

const END_USER_STAKEHOLDER_SEGMENT =
  /^(?:카페\s*|매장\s*)?(?:이용자|손님|고객|소비자|방문객|주문자|체류\s*고객)|^(?:최종\s*)?(?:이용자|소비자|손님)$/iu;

function normalizeSegmentToken(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function overlapsPrimaryUserSegment(
  segment: string,
  body: string,
  primaryLabels: string[],
): boolean {
  if (!primaryLabels.length) return false;
  const segNorm = normalizeSegmentToken(segment);
  for (const label of primaryLabels) {
    const labelNorm = normalizeSegmentToken(label);
    if (
      segNorm.includes(labelNorm) ||
      labelNorm.includes(segNorm) ||
      segNorm === labelNorm
    ) {
      return true;
    }
    for (const token of label.split(/[·,/\s]+/).filter((w) => w.length >= 2)) {
      const tokenNorm = normalizeSegmentToken(token);
      if (
        tokenNorm.length >= 2 &&
        (segNorm.includes(tokenNorm) || segment.includes(token))
      ) {
        if (!/(?:사장|점주|직원|바리스타|공급|플랫폼|담당|운영|기관|규제|파트너)/u.test(
          segment,
        )) {
          return true;
        }
      }
    }
  }
  const combined = `${segment} ${body}`;
  for (const label of primaryLabels) {
    if (combined.includes(label)) return true;
  }
  return false;
}

function isEndUserAsStakeholder(segment: string, body: string): boolean {
  const seg = segment.trim();
  if (END_USER_STAKEHOLDER_SEGMENT.test(seg)) return true;
  const combined = `${segment} ${body}`;
  if (
    /(?:최종\s*)?(?:이용자|소비자|손님|고객|방문객)/u.test(combined) &&
    !/(?:운영|사장|점주|직원|바리스타|공급|플랫폼|담당|기관|규제|파트너|B2B|내부)/u.test(
      combined,
    )
  ) {
    return true;
  }
  return false;
}

/** 이해 관계자 프로필에서 주 사용자·최종 이용자 항목 제거 */
export function dedupeStakeholdersFromPrimaryUsers(
  stakeholderFindings: string,
  primaryUserFindings: string,
): string {
  const sanitized = sanitizeContextualFindings(stakeholderFindings);
  const primaryLabels = extractPrimaryUserSegmentLabels(primaryUserFindings);
  const lines = sanitized.split("\n");
  let inProfileSection = false;
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/누구인지.*(?:프로필|이해\s*관계자)/u.test(trimmed)) {
      inProfileSection = true;
      result.push(line);
      continue;
    }
    if (
      inProfileSection &&
      trimmed &&
      !/^[·•]/.test(trimmed) &&
      !trimmed.startsWith("※") &&
      !trimmed.startsWith("[") &&
      !trimmed.startsWith("문제점")
    ) {
      inProfileSection = false;
    }
    if (inProfileSection && /^[·•]/.test(trimmed)) {
      const item = trimmed.replace(/^[·•]\s*/, "");
      const parsed = parseProfileItem(item);
      if (isEndUserAsStakeholder(parsed.segment, parsed.body)) continue;
      if (
        overlapsPrimaryUserSegment(
          parsed.segment,
          parsed.body,
          primaryLabels,
        )
      ) {
        continue;
      }
    }
    result.push(line);
  }

  return sanitizeContextualFindings(result.join("\n"));
}

export type PeopleResearchPriorContext = {
  primaryUserFindings?: string;
  primaryUserSegments?: string[];
};

function primaryUsersHeuristic(
  problem: string,
  domain: ProblemDomain,
  userItems: string[],
): string {
  const problemLine = `문제점 「${clipProblem(problem)}」`;

  const profiles: Record<ProblemDomain, string[]> = {
    cafe: [
      "· 직장인·오피스 근무자 (25~40대, 평일 통근·점심 시간 카페 이용): 오피스 밀집 상권에서 테이크아웃·매장 이용이 잦은 핵심 소비 세그먼트예요.",
      "· 대학생·취준생 (20대 초중반, 대학가·스터디 카페 체류): 가격·와이파이·좌석을 중시하며 한가·혼잡 시간대 이용 패턴이 갈리는 세그먼트예요.",
      "· 주부·부모 (30~50대, 동네·마트 인근 카페 방문): 아이 동반·심부름 겸 방문하는 생활 밀착형 이용자 세그먼트예요.",
    ],
    app: [
      "· 일상 사용자 (20~40대, 해당 서비스를 주 1회 이상 쓰는 개인): 앱·서비스를 직접 실행하는 최종 이용자 세그먼트예요.",
      "· 초보·고령 사용자 (50대 이상 또는 디지털 숙련도 낮음): 온보딩·인증·용어에 익숙하지 않은 이용자 세그먼트예요.",
      "· 파워 사용자 (고빈도·숙련 이용자): 단축·자동화·정보 밀도를 중시하는 헤비 유저 세그먼트예요.",
    ],
    public: [
      "· 서비스 이용자·환자 (해당 공공·의료·교육 서비스를 직접 받는 사람): 접수·대기·안내를 겪는 핵심 이용자 세그먼트예요.",
      "· 학부모·보호자 (자녀·피보호자를 대신해 의사결정·동행): 본인이 아닌 대상을 위해 서비스를 이용하는 세그먼트예요.",
      "· 신규·재방문 이용자 (처음 방문 또는 간헐적 이용): 절차·안내 이해 수준이 달라 분리해 볼 가치가 있는 세그먼트예요.",
    ],
    generic: [
      "· 핵심 이용자 (문제를 가장 직접·반복적으로 겪는 사람): 1단계 문제점을 일상 맥락에서 체감하는 주 사용자 후보예요.",
      "· 간접 영향 받는 사람 (가족·동료·이웃): 본인이 아니어도 문제의 파급을 받을 수 있는 인접 세그먼트예요.",
      "· 초보·숙련 이용자 (경험 수준별): 같은 문제라도 사용 경험에 따라 행태·기대가 달라지는 세그먼트예요.",
    ],
  };

  const traitsBehaviors: Record<ProblemDomain, string[]> = {
    cafe: [
      "· 직장인: 주 3~5회 음료 구매, 출근 전·점심 피크에 집중 방문, 앱·현장 주문·픽업 동선을 루틴화하는 패턴.",
      "· 대학생·취준생: 장시간 체류·와이파이·가격 민감, 혼잡 시간대에는 좌석·대기 회피 또는 이탈하는 행태.",
      "· 주부·부모: 동반 방문·메뉴 선택 부담, 매장 동선·대기 공간·안전을 우선 고려하는 이용 패턴.",
    ],
    app: [
      "· 일상 사용자: 검색·비교·결제를 한 흐름으로 끝내려 하며, 단계가 끊기면 재시도·대안 탐색을 반복하는 행태.",
      "· 초보·고령 사용자: 도움말·피드백 없이는 진입을 미루거나 중단하는 패턴, 익숙한 대체 수단을 유지하는 경향.",
      "· 파워 사용자: 단축·자동완성·정보 밀도를 기대하고, 불편 누적 시 빠르게 대체 서비스로 이동하는 행태.",
    ],
    public: [
      "· 이용자·환자: 절차·서류·대기 시간에 민감하며, 안내 부재 시 창구·콜센터에 재문의하는 패턴.",
      "· 학부모·보호자: 대리 신청·동행·서류 준비를 맡으며, 정보 비대칭 속에서 추가 확인을 반복하는 행태.",
      "· 신규·재방문 이용자: 안내·표지판·직원 응대에 의존하며, 첫 방문과 재방문의 기대·불안이 다른 패턴.",
    ],
    generic: [
      "· 핵심 이용자: 문제가 반복되는 시간대·상황·목적이 뚜렷하며, 해결 시도·대안 탐색을 스스로 기록할 수 있는 행태.",
      "· 간접 영향 집단: 본인 일정·비용·스트레스로 문제 파급을 체감하나, 직접 해결 주체는 아닌 패턴.",
      "· 숙련도별 이용자: 같은 기능에도 학습 곡선·기대치가 달라, 인터뷰·관찰 질문을 나눠야 하는 행태.",
    ],
  };

  const toKnowBridge: Record<ProblemDomain, string[]> = {
    cafe: [
      `· 직장인 세그먼트: 「${clipProblem(problem, 48)}」이 출근 전·점심 피크에서 어떻게 드러나는지 주문~수령 흐름을 현장에서 확인.`,
      "· 세그먼트별로 이용 빈도·선호 채널(앱·키오스크·카운터)을 To-know 질문으로 구체화해 현장 조사에 연결.",
    ],
    app: [
      `· 각 세그먼트별로 「${clipProblem(problem, 48)}」이 발생하는 화면·단계·상황을 Diary·인터뷰로 검증.`,
      "· 초보 vs 파워 사용자는 같은 기능에서도 실패 지점이 달라, To-know를 나눠 작성하는 것이 좋습니다.",
    ],
    public: [
      `· 이용자·보호자 세그먼트별로 「${clipProblem(problem, 48)}」이 접수·대기·안내 중 어디서 막히는지 현장 확인.`,
      "· 절차 이해 수준·방문 빈도에 따라 To-know 질문을 분리해 실제 리서치 대상을 좁힙니다.",
    ],
    generic: [
      `· 위 세그먼트마다 「${clipProblem(problem, 48)}」을 누가·언제·어떤 목적으로 겪는지 To-know 질문으로 구체화.`,
      "· 프로필 가설을 현장·사용자 조사로 검증한 뒤, To-know list의 대상·질문을 확정합니다.",
    ],
  };

  const extra =
    userItems.length > 0
      ? userItems.map((x) => `· ${x}: 사용자 보완 메모로 추가된 후보입니다.`).join("\n")
      : "";

  return sanitizeContextualFindings(
    [
      "[주 사용자] 사전 조사 메모 (가설·2차 자료 기반)",
      "",
      problemLine,
      "",
      "누구인지 (주 사용자 프로필)",
      ...profiles[domain],
      ...(extra ? ["", extra] : []),
      "",
      "특성·행태",
      ...traitsBehaviors[domain],
      "",
      "To-know·현장 조사 연결 (가설)",
      ...toKnowBridge[domain],
      "",
      "※ AI·2차 자료 기반 가설입니다. 현장·사용자 조사로 검증하세요.",
    ].join("\n"),
  );
}

function stakeholdersHeuristic(
  problem: string,
  domain: ProblemDomain,
  stakeholderItems: string[],
  primaryUserFindings = "",
): string {
  const problemLine = `문제점 「${clipProblem(problem)}」`;

  const profiles: Record<ProblemDomain, string[]> = {
    cafe: [
      "· 카페 사장·운영자 (매장 손익·운영 정책 결정): 메뉴·인력·동선·프로모션을 정하는 경영 주체예요. 대기·주문 방식이 매출·회전율·인건비와 맞물립니다.",
      "· 바리스타·홀·아르바이트 (현장 제조·수납·안내): 손님과 맞닿아 문제를 가장 먼저 흡수하는 실행 역할이에요. 피크 타임·클레임·재고 이슈가 여기서 드러납니다.",
      "· 원두·장비·소모품 공급사 (B2B 파트너): 매장 운영 조건·키오스크·POS 연동에 영향을 주는 공급망 이해관계자예요.",
      "· 배달·예약 플랫폼 담당 (중개 채널): 주문이 앱으로 넘어가면 대기·픽업 흐름이 플랫폼 정책과 맞물립니다.",
    ],
    app: [
      "· 서비스 기획·PM (기능·정책 결정): 사용자 흐름·알림·온보딩을 설계하는 제품 책임 역할이에요.",
      "· 개발·QA·운영 (구현·배포·장애 대응): 기술 제약·버그·성능이 체감 문제로 전달되는 지점을 만듭니다.",
      "· 마케팅·CS (유입·이탈·VoC 수집): 사용자 불만·요청이 정형화되어 들어오는 창구예요.",
      "· 제휴·플랫폼 파트너: 외부 연동·정산·정책이 서비스 경험에 간접 영향을 줍니다.",
    ],
    public: [
      "· 행정·기관 담당자 (절차·규정 운영): 민원·접수·승인 흐름을 관리하는 정책 실행 주체예요.",
      "· 현장 실무·강사·의료진 (직접 서비스 제공): 이용자와 맞닿아 규정과 현실의 간극을 체감합니다.",
      "· 감독·평가·예산 부서: 성과·컴플라이언스 기준이 현장 선택에 제약을 겁니다.",
    ],
    generic: [
      "· 운영·관리 담당 (내부 의사결정): 문제 해결 방향·우선순위·예산을 조율하는 조직 내 이해관계자예요.",
      "· 파트너·공급사 (외부 협력): 제품·서비스 품질·일정·계약 조건으로 문제의 원인·해결 수단에 영향을 줍니다.",
      "· 규제·심사·감독 기관 (간접): 허용 범위·보고 의무가 솔루션 선택을 좁힐 수 있어요.",
      "· 이웃·커뮤니티 (간접 이해관계): 소음·동선·평판 등 주변 이슈로 문제 정의가 확장될 수 있습니다.",
    ],
  };

  const roles: Record<ProblemDomain, string[]> = {
    cafe: [
      "· 사장은 수요·공급·인력을 동시에 맞추며, 대기·주문 문제를 손님 불편이 아니라 운영 KPI로도 봅니다.",
      "· 현장 직원은 실행·응대 역할로, 시스템·동선·교대가 곧 서비스 품질과 연결됩니다.",
      "· 플랫폼·공급사는 간접 통제 역할을 해, 매장 단독으로 바꾸기 어려운 조건을 만듭니다.",
    ],
    app: [
      "· 기획·개발은 제품 설계·기술 부채를 통해 문제를 재현·완화·악화시킬 수 있어요.",
      "· CS·마케팅은 사용자 목소리 수집·전달 통로로, 현장 조사 전 탐색 단서를 줍니다.",
    ],
    public: [
      "· 행정 담당은 절차 준수와 이용자 편의 사이에서 균형을 맞추는 역할입니다.",
      "· 현장 실무자는 규정 해석·예외 처리를 맡아, 문제의 실제 모습이 드러나는 접점입니다.",
    ],
    generic: [
      "· 내부 담당자는 우선순위·책임을 나누며, 문제를 누구의 과제인가로 재구성합니다.",
      "· 외부 이해관계자는 제약·기회를 동시에 가져와, 해결책의 범위를 넓히거나 좁힙니다.",
    ],
  };

  const extra =
    stakeholderItems.length > 0
      ? stakeholderItems
          .map((x) => `· ${x}: 보완 메모로 추가된 이해 관계자 후보입니다.`)
          .join("\n")
      : "";

  const primaryLabels = primaryUserFindings.trim()
    ? extractPrimaryUserSegmentLabels(primaryUserFindings)
    : [];
  const primaryNote =
    primaryLabels.length > 0
      ? `· 주 사용자(이미 정리): ${primaryLabels.join(", ")} — 이해 관계자 목록에 포함하지 않음.`
      : "· 주 사용자(손님·이용자·소비자)는 이해 관계자가 아님.";

  const raw = sanitizeContextualFindings(
    [
      "[이해 관계자] 사전 조사 메모 (가설·2차 자료 기반)",
      "",
      problemLine,
      "",
      "누구인지 (이해 관계자 프로필)",
      ...profiles[domain],
      ...(extra ? ["", extra] : []),
      "",
      "역할·영향",
      ...roles[domain],
      "",
      "문제와의 연결 (가설)",
      primaryNote,
      `· 「${clipProblem(problem, 48)}」을 둘러싼 운영·공급·중개·규제 관계를 그려 두면, 주 사용자 조사와 병행할 대상이 보입니다.`,
      "",
      "※ AI·2차 자료 기반 가설입니다. 현장·사용자 조사로 검증하세요.",
    ].join("\n"),
  );

  return dedupeStakeholdersFromPrimaryUsers(raw, primaryUserFindings);
}

export function heuristicPeopleDimensionResearch(
  problem: string,
  dimensionId: PeopleContextualDimensionId,
  answers: ContextualDimensionAnswers,
  prior?: PeopleResearchPriorContext,
): string {
  const domain = inferProblemDomain(problem);
  if (dimensionId === "primary_users") {
    return primaryUsersHeuristic(
      problem,
      domain,
      mergeUserItems(answers, "primary_users"),
    );
  }
  const primaryFindings =
    prior?.primaryUserFindings?.trim() ?? "";
  return stakeholdersHeuristic(
    problem,
    domain,
    mergeUserItems(answers, "stakeholders"),
    primaryFindings,
  );
}

export function buildPeopleResearchPromptExtra(
  dimensionId: PeopleContextualDimensionId,
  prior?: PeopleResearchPriorContext,
): string {
  if (dimensionId === "primary_users") {
    return `
${buildDimensionGuidelinePrompt("primary_users")}

주 사용자 영역 — 대상자 프로필 분석(+ Diary Studies) 관점:
- **먼저 누구인지**를 명확히 정의하세요 (세그먼트명·연령·직업·역할·이용 맥락). "어려움을 겪는다"·"불편하다"만 쓰지 마세요.
- 섹션 1 「누구인지 (주 사용자 프로필)」: 3~4개 세그먼트. 각 항목 형식 「세그먼트명 (인구·역할·한 줄 정체성)」: **누구인지**를 한 문장으로 (평서문).
- 섹션 2 「특성·행태」: 각 세그먼트의 라이프스타일·이용 빈도·선호·의사결정·행동 패턴 3~4개 불릿. 형식 「세그먼트: 특성·행태 설명」. 불편·니즈 나열이 아닌 **프로필·행태** 중심.
- 섹션 3 「To-know·현장 조사 연결 (가설)」: 위 프로필을 바탕으로 To-know list·현장 리서치에서 확인할 방향 2~3개 불릿.
- 600~900자. 질문형 금지.`.trim();
  }

  const primarySegments = prior?.primaryUserSegments?.length
    ? prior.primaryUserSegments.join(", ")
    : prior?.primaryUserFindings?.trim()
      ? extractPrimaryUserSegmentLabels(prior.primaryUserFindings).join(", ")
      : "";

  const excludeBlock = primarySegments
    ? `
- **이미 정리된 주 사용자(최종 이용자)**: ${primarySegments}
- 위 세그먼트·손님·이용자·소비자·고객·방문객은 **이해 관계자에 절대 포함하지 마세요**.`
    : `
- 손님·이용자·소비자·고객·방문객 등 **최종 이용자(주 사용자)** 는 이해 관계자가 아닙니다.`;

  return `
${buildDimensionGuidelinePrompt("stakeholders")}

이해 관계자 영역 — 관련 대상자 사전 조사 관점:
- 이해 관계자는 **운영·중개·공급·규제·전문가** 등 주 사용자가 아닌 주체입니다.${excludeBlock}
- 섹션 1 「누구인지 (이해 관계자 프로필)」: 3~4명. 각 항목 「역할·조직 라벨 (한 줄 정체성)」: **누구·어떤 조직**인지 1문장 + **무슨 일을 하는지** 1~2문장 (평서문).
- 섹션 2 「역할·영향」: 문제·해결에 미치는 **의사결정·실행·중개** 관계 2~3개 불릿.
- 섹션 3 「문제와의 연결 (가설)」: 주 사용자와 다른 **간접** 연결 1~2개 불릿.
- 600~900자. 질문형 금지.`.trim();
}

export function finalizePeopleFindings(
  dimensionId: PeopleContextualDimensionId,
  findings: string,
  prior?: PeopleResearchPriorContext,
): string {
  const sanitized = sanitizeContextualFindings(findings);
  if (dimensionId === "stakeholders") {
    return dedupeStakeholdersFromPrimaryUsers(
      sanitized,
      prior?.primaryUserFindings ?? "",
    );
  }
  return sanitized;
}

/** 캔버스 펼침용 — 섹션 제목과 불릿 블록 */
export type PeopleFindingsSection = {
  title: string;
  items: string[];
};

export function parsePeopleFindingsSections(
  findings: string,
): PeopleFindingsSection[] {
  const lines = sanitizeContextualFindings(findings)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: PeopleFindingsSection[] = [];
  let current: PeopleFindingsSection | null = null;

  const isHeader = (line: string) =>
    !line.startsWith("·") &&
    !line.startsWith("※") &&
    !line.startsWith("[") &&
    !line.startsWith("문제점") &&
    line.length < 64;

  for (const line of lines) {
    if (line.startsWith("※") || line.startsWith("[")) continue;
    if (line.startsWith("문제점")) continue;

    if (isHeader(line)) {
      current = { title: line, items: [] };
      sections.push(current);
      continue;
    }

    if (/^[·•\-*]/.test(line)) {
      const item = line.replace(/^[·•\-*]\s*/, "").trim();
      if (!item) continue;
      if (!current) {
        current = { title: "정리", items: [] };
        sections.push(current);
      }
      current.items.push(item);
    }
  }

  return sections.filter((s) => s.items.length > 0);
}

export function peopleCollapsedPreview(findings: string): string {
  const sections = parsePeopleFindingsSections(findings);
  const profiles = sections.find((s) => /누구인지|프로필/u.test(s.title));
  if (!profiles?.items.length) return "프로필 · 펼쳐서 보기";
  const first = profiles.items[0];
  const short =
    first.length > 56 ? `${first.slice(0, 56)}…` : first;
  const count = profiles.items.length;
  return count > 1 ? `${short} 외 ${count - 1}명 · 펼쳐서 보기` : `${short} · 펼쳐서 보기`;
}
