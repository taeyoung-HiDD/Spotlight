export type PrincipleRing = "outer" | "middle" | "inner";

export interface PrincipleCard {
  id: string;
  ring: PrincipleRing;
  /** 원리만 — 완성 해결책 문장 금지 */
  principleText: string;
  /** 출처 사례 1줄 */
  sourceExample: string;
  /** true면 기본 노출에서 제외 (대표 사례) */
  isCommon: boolean;
}

/** 바깥(이종) → 중간(유사) → 안쪽(경쟁사) */
export const PRINCIPLE_RING_ORDER: PrincipleRing[] = [
  "outer",
  "middle",
  "inner",
];

export const PRINCIPLE_RING_LABELS: Record<PrincipleRing, string> = {
  outer: "이종 산업",
  middle: "유사 산업",
  inner: "경쟁사",
};

export const PRINCIPLE_CARDS: PrincipleCard[] = [
  {
    id: "pc-outer-luggage",
    ring: "outer",
    principleText: "대상 자체가 상태를 발신하고, 사람의 확인 행위를 줄인다",
    sourceExample: "공항 수하물 추적 — 가방이 위치를 스스로 알린다",
    isCommon: false,
  },
  {
    id: "pc-outer-greenhouse",
    ring: "outer",
    principleText: "환경이 임계치를 넘기면 자동으로 개입하고, 평소엔 침묵한다",
    sourceExample: "스마트 온실 — 습도 센서가 환기만 필요할 때 연다",
    isCommon: false,
  },
  {
    id: "pc-outer-library",
    ring: "outer",
    principleText: "자리를 비운 뒤에도 ‘어디에 뒀는지’를 공간이 기억한다",
    sourceExample: "도서관 서가 센서 — 반납 위치를 공간에 남긴다",
    isCommon: false,
  },
  {
    id: "pc-middle-pharmacy",
    ring: "middle",
    principleText: "재고를 ‘개수’가 아니라 ‘다음 행동 시점’으로 보여 준다",
    sourceExample: "동네 약국 발주판 — 언제 주문할지 시각만 강조",
    isCommon: false,
  },
  {
    id: "pc-middle-cafe",
    ring: "middle",
    principleText: "바쁜 순간에만 짧은 확인 루틴을 끼워 넣고, 평소 흐름은 건드리지 않는다",
    sourceExample: "카페 마감 체크리스트 — 피크 후 2분만 점검",
    isCommon: false,
  },
  {
    id: "pc-middle-clinic",
    ring: "middle",
    principleText: "한 사람이 모든 칸을 보지 않게, 역할별 빈칸만 노출한다",
    sourceExample: "소규모 클리닉 재고 — 담당 구역만 알림",
    isCommon: false,
  },
  {
    id: "pc-inner-pos",
    ring: "inner",
    principleText: "판매 순간과 재고 차감을 한 동작으로 묶는다",
    sourceExample: "매장 POS 연동 재고 — 결제 시 차감",
    isCommon: false,
  },
  {
    id: "pc-inner-barcode",
    ring: "inner",
    principleText: "손으로 세지 않고, 스캔 한 번에 ‘있다/없다’만 확정한다",
    sourceExample: "바코드 순회 검수 — 누락만 표시",
    isCommon: false,
  },
  // 대표 사례 — 기본 노출 제외
  {
    id: "pc-common-uber",
    ring: "outer",
    principleText: "대기·이동 상태를 수요자에게 실시간으로 투명하게 연다",
    sourceExample: "Uber",
    isCommon: true,
  },
  {
    id: "pc-common-airbnb",
    ring: "outer",
    principleText: "남는 자원을 신뢰 장치와 함께 빌려 쓴다",
    sourceExample: "Airbnb",
    isCommon: true,
  },
  {
    id: "pc-common-baemin",
    ring: "middle",
    principleText: "주문·배달·알림을 한 흐름으로 묶는다",
    sourceExample: "배달의민족",
    isCommon: true,
  },
];

export function principleCardsForRing(
  ring: PrincipleRing,
  opts?: { includeCommon?: boolean; excludeIds?: Set<string> },
): PrincipleCard[] {
  const exclude = opts?.excludeIds ?? new Set<string>();
  return PRINCIPLE_CARDS.filter((card) => {
    if (card.ring !== ring) return false;
    if (!opts?.includeCommon && card.isCommon) return false;
    if (exclude.has(card.id)) return false;
    return true;
  });
}
