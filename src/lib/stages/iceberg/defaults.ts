import type { IcebergModelData, IcebergPrepState } from "@/lib/stages/iceberg/types";

export const DEFAULT_ICEBERG_PREP: IcebergPrepState = {
  phase: "discovery",
  step: "explicit",
  explicitNotes: "",
  tacitNotes: "",
  latentNotes: "",
};

/** 첫 진입 · discovery 후 채움 전 */
export const EMPTY_ICEBERG_DATA: IcebergModelData = {
  prep: { ...DEFAULT_ICEBERG_PREP },
  explicit: { items: [] },
  tacit: { items: [] },
  tacitAutoNote: "",
  latent: { headline: "", quote: "", evidence: "" },
  decision: null,
};

/** 컷 9 시안 데모 — 개발·시연용 (자동 병합 비활성) */
export const DEMO_ICEBERG_DATA: IcebergModelData = {
  prep: { phase: "refining", step: "done", explicitNotes: "", tacitNotes: "", latentNotes: "" },
  explicit: {
    items: [
      "재고 관리 시간을 줄이고 싶다",
      "손글씨 메모가 편하다",
      "앱은 입력 시간이 더 걸린다",
    ],
  },
  tacit: {
    items: [
      "하루에 여러 번 카운터로 돌아와 직접 확인",
      "손글씨 메모를 자주 다시 봄 — 확인 자체가 안심",
    ],
  },
  tacitAutoNote: "단계 3 행동 메모에서 자동 연결",
  latent: {
    headline: "매장 통제감을 잃지 않기",
    quote: "모르는 상태를 견디지 않고 싶다",
    evidence:
      "근거 · 인용 2개 + 행동 패턴 3개 + 어긋나는 신호 분석 (Light는 다른 결)",
  },
  decision: null,
};

/** @deprecated EMPTY_ICEBERG_DATA 사용 — 하위 호환 */
export const DEFAULT_ICEBERG_DATA = DEMO_ICEBERG_DATA;
