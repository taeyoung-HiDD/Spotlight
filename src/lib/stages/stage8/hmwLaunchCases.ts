/** HMW 칸 진입 시 Kevin이 소개하는 출시 서비스 사례 */

export type HmwLaunchCaseRegion = "korea" | "global";

export type HmwLaunchCase = {
  name: string;
  summary: string;
  hmwLink: string;
  url: string;
  region: HmwLaunchCaseRegion;
  /** 설명란에만 append할 변형 힌트 (제품명 복붙 금지) */
  hint: string;
};

export type HmwLaunchCasesResult = {
  cases: HmwLaunchCase[];
  source: "groq+web" | "heuristic_fallback";
};

export type ActiveHmwForCases = {
  id: string;
  hmwText: string;
  latentNeedText: string;
};

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** 검색·폴백용으로 HMW에서 짧은 키워드 덩어리를 뽑는다 */
export function hmwSearchSeed(hmwText: string, latentNeedText = ""): string {
  const raw = `${hmwText} ${latentNeedText}`
    .replace(/어떻게\s*하면/g, " ")
    .replace(/할\s*수\s*있을까\??/g, " ")
    .replace(/하기\s*위해/g, " ")
    .replace(/[?？]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clip(raw, 80);
}

export function buildHmwLaunchSearchQueries(
  hmwText: string,
  latentNeedText = "",
): string[] {
  const seed = hmwSearchSeed(hmwText, latentNeedText);
  if (!seed) {
    return ["출시된 서비스 사용자 문제 해결 사례", "launched product solving user need"];
  }
  return [
    `${seed} 출시된 앱 서비스 사례`.slice(0, 120),
    `${seed} launched app product solution`.slice(0, 120),
  ];
}

/** 검색·AI 없을 때 — 카테고리 힌트만 있는 일반 사례 (검증 필요) */
export function heuristicHmwLaunchCases(
  hmwText: string,
  latentNeedText = "",
): HmwLaunchCase[] {
  const seed = hmwSearchSeed(hmwText, latentNeedText) || "비슷한 불편";
  return [
    {
      name: "국내 핀테크·생활 관리 앱 (예시 방향)",
      summary: `${clip(seed, 36)} 같은 불편을 가계부·알림·자동화로 줄이려는 출시 서비스들이 있어요. 실제 제품명은 직접 검색해 확인해 주세요.`,
      hmwLink: "비슷한 ‘관리·알림·습관’ 축으로 HMW에 맞닿을 수 있어요 (가설).",
      url: "",
      region: "korea",
      hint: "알림·자동화로 사용자가 ‘매번 기억하지 않아도’ 되게 만드는 방향을 짧게 적어 보세요.",
    },
    {
      name: "글로벌 습관·코칭 서비스 (예시 방향)",
      summary:
        "목표를 잘게 나누고 진행을 보이게 하는 코칭·습관 앱이 이미 나와 있어요. 우리 HMW만의 차별 포인트를 남겨 두세요.",
      hmwLink: "‘한눈에 보이게 / 쉽게’ 수식과 잘 맞을 수 있어요 (가설).",
      url: "",
      region: "global",
      hint: "진행이 한눈에 보이고 부담이 덜한 경험으로 바꾸려면 무엇을 줄일지 적어 보세요.",
    },
  ];
}
