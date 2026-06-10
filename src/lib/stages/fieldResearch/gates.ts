import {
  RESPONDENT_TARGET,
  SESSION_PASS_RATIO,
} from "@/lib/stages/fieldResearch/defaults";
import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";

export function recruitedCount(data: FieldResearchData) {
  return data.respondents.filter((r) => r.recruitStatus === "recruited").length;
}

export function consentCount(data: FieldResearchData) {
  return data.respondents.filter((r) => r.consentReceived).length;
}

export function sessionCompleteCount(data: FieldResearchData) {
  return data.respondents.filter((r) => {
    const s = data.sessions[r.id];
    return (
      s?.completed &&
      s.debriefing.surprise.trim() &&
      s.debriefing.keyQuote.trim()
    );
  }).length;
}

export function consentGatePassed(data: FieldResearchData) {
  return data.allConsentConfirmed && consentCount(data) >= RESPONDENT_TARGET;
}

export function stagePassGate(data: FieldResearchData) {
  const minSessions = Math.ceil(RESPONDENT_TARGET * SESSION_PASS_RATIO);
  return sessionCompleteCount(data) >= minSessions && consentGatePassed(data);
}
