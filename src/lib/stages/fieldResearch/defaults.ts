import type {
  FieldResearchData,
  RespondentSession,
  SessionLogEntry,
  ToKnowPrepState,
} from "@/lib/stages/fieldResearch/types";

export const DEFAULT_TO_KNOW_PREP: ToKnowPrepState = {
  phase: "discovery",
  step: "alignment",
  targetPerson: "",
  situation: "",
  stakeholders: "",
  competitiveContext: "",
};

const DEFAULT_LOG_PARK: SessionLogEntry[] = [
  {
    id: "log-1",
    time: "14:34",
    body: "매장 상황 살펴봄 — 카운터 뒤 노트 + 손글씨 재고 메모 보임",
    kind: "behavior",
  },
  {
    id: "log-2",
    time: "14:42",
    body: "재고 관리는 시간이 너무 오래 걸려요. 매일 마감 후 30분.",
    kind: "quote",
    quoteTag: "인용구 · 박사장",
  },
  {
    id: "log-3",
    time: "14:51",
    body: "하루 중간에도 카운터로 돌아와 재고 확인하는 모습 관찰",
    kind: "behavior",
    quoteTag: "행동 메모 · 빈도 높음",
  },
  {
    id: "log-4",
    time: "15:08",
    body: "모르는 상태가 제일 불안해요. 차라리 직접 확인하는 게 마음 편해요.",
    kind: "quote",
    quoteTag: "인용구 · 박사장 · 결정적",
  },
  {
    id: "log-5",
    time: "15:19",
    body: "앱 추천 받아본 적 있는지 물음 — 안 써본다 답. 이유: 입력 시간이 더 걸림",
    kind: "note",
    quoteTag: "발화 메모",
  },
];

function sessionPark(): RespondentSession {
  return {
    place: "식당",
    method: "1차 방문 대화",
    timeRange: "14:30 ~ 15:45",
    logEntries: DEFAULT_LOG_PARK,
    debriefing: {
      surprise: "앱을 안 쓰는 이유가 입력 시간 — 디지털 전환 자체가 비효율",
      keyQuote: '"모르는 상태가 제일 불안해요"',
      nextCheck: "김카페·정빵집도 같은 결인지 — Heavy vs Light 패턴 비교",
    },
    completed: false,
  };
}

function emptySession(): RespondentSession {
  return {
    place: "",
    method: "",
    timeRange: "",
    logEntries: [],
    debriefing: { surprise: "", keyQuote: "", nextCheck: "" },
    completed: false,
  };
}

export const DEFAULT_FIELD_RESEARCH: FieldResearchData = {
  toKnowPrep: { ...DEFAULT_TO_KNOW_PREP },
  toKnowTable: [],
  researchMethods: [],
  researchProtocol: "",
  prepConfirmed: false,
  respondents: [
    {
      id: "r-park",
      shortLabel: "박",
      name: "박사장",
      subtitle: "식당 · Heavy",
      role: "heavy",
      recruitStatus: "recruited",
      consentReceived: true,
    },
    {
      id: "r-cafe",
      shortLabel: "김",
      name: "김카페",
      subtitle: "카페 · Heavy",
      role: "heavy",
      recruitStatus: "recruited",
      consentReceived: true,
    },
    {
      id: "r-bread",
      shortLabel: "정",
      name: "정빵집",
      subtitle: "빵집 · Light",
      role: "light",
      recruitStatus: "recruited",
      consentReceived: true,
    },
    {
      id: "r-control-1",
      shortLabel: "?",
      name: "대조군 1",
      subtitle: "일반 매장 · 대기",
      role: "control",
      recruitStatus: "pending",
      consentReceived: false,
    },
    {
      id: "r-control-2",
      shortLabel: "+",
      name: "대조군 2",
      subtitle: "미정",
      role: "control",
      recruitStatus: "open",
      consentReceived: false,
    },
  ],
  allConsentConfirmed: false,
  activeRespondentId: "r-park",
  sessions: {
    "r-park": sessionPark(),
    "r-cafe": emptySession(),
    "r-bread": emptySession(),
    "r-control-1": emptySession(),
    "r-control-2": emptySession(),
  },
};

export const RESPONDENT_TARGET = 5;
export const SESSION_PASS_RATIO = 0.6;
