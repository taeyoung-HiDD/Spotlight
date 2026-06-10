/** 단계 5 진짜 필요 찾기(세 층) — artifacts.slots 콘텐츠 */
export type IcebergDecision = "accept" | "refine" | "why_ladder";

export type IcebergDiscoveryStep = "explicit" | "tacit" | "latent" | "done";

export type IcebergPrepPhase = "discovery" | "refining";

/** 코치 대화로 세 층 초안 생성 전 맥락 수집 */
export interface IcebergPrepState {
  phase: IcebergPrepPhase;
  step: IcebergDiscoveryStep;
  explicitNotes: string;
  tacitNotes: string;
  latentNotes: string;
}

export interface IcebergLayerItems {
  items: string[];
}

export interface IcebergLatentLayer {
  headline: string;
  quote: string;
  evidence: string;
}

export interface IcebergModelData {
  prep: IcebergPrepState;
  explicit: IcebergLayerItems;
  tacit: IcebergLayerItems;
  tacitAutoNote: string;
  latent: IcebergLatentLayer;
  decision: IcebergDecision | null;
}

export const ICEBERG_SLOT_KEYS = [
  "explicit",
  "tacit",
  "latent",
  "decision",
] as const;

export type IcebergSlotKey = (typeof ICEBERG_SLOT_KEYS)[number];
