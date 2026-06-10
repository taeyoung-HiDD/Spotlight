/**
 * Spotlight 시스템 이벤트 — PRD §6.2
 * 모바일·웹·코치 서버 간 크로스 디바이스 Payload
 */

/** PRD §6.2 — 모바일 오디오 인제스트 완료 */
export const MOBILE_AUDIO_RECORD_COMPLETED =
  "mobile.audio_record.completed" as const;

export interface MobileAudioRecordCompletedPayload {
  project_id: string;
  stage_id: number;
  slot_id: string;
  media_url: string;
  stt_fallback_text: string;
  device_meta: {
    platform: string;
    version: string;
  };
}

export interface MobileAudioRecordCompletedEvent {
  event: typeof MOBILE_AUDIO_RECORD_COMPLETED;
  payload: MobileAudioRecordCompletedPayload;
}

/** PRD §6.2 — 막힘 감지 및 개입 루프 */
export const STUCK_DETECTED = "stuck.detected" as const;

export type StuckSignalType = "time_limit_5m_over" | (string & {});

export interface StuckDetectedPayload {
  project_id: string;
  card_id: string;
  signal_type: StuckSignalType;
}

export interface StuckDetectedEvent {
  event: typeof STUCK_DETECTED;
  payload: StuckDetectedPayload;
}

export type SpotlightSystemEvent =
  | MobileAudioRecordCompletedEvent
  | StuckDetectedEvent;

export type SpotlightSystemEventName = SpotlightSystemEvent["event"];
