import type {
  Respondent,
  RespondentRecruitStatus,
  RespondentRole,
  RespondentSession,
} from "@/lib/stages/fieldResearch/types";
import type { Stage3ResearchSegment } from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import { normalizeRespondentRole } from "@/lib/stages/fieldResearch/extremeUserRole";
import { readSelectionProfile } from "@/lib/stages/fieldResearch/selectionProfile";

export { normalizeRespondentRole, EXTREME_ROLE_LABEL } from "@/lib/stages/fieldResearch/extremeUserRole";

export function normalizeRecruitStatus(raw: unknown): RespondentRecruitStatus {
  if (raw === "recruited" || raw === "pending" || raw === "open") return raw;
  return "pending";
}

export function normalizeRespondent(
  raw: unknown,
  index: number,
): Respondent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name =
    typeof o.name === "string"
      ? o.name.trim().slice(0, 80)
      : typeof o.title === "string"
        ? o.title.trim().slice(0, 80)
        : "";
  const subtitle =
    typeof o.subtitle === "string"
      ? o.subtitle.trim().slice(0, 120)
      : typeof o.title === "string" && name !== o.title.trim()
        ? o.title.trim().slice(0, 120)
        : "";
  if (!name && !subtitle) return null;

  const profile = readSelectionProfile(o);
  const role =
    normalizeRespondentRole(o.role) ??
    (index === 0 ? "heavy" : index === 1 ? "light" : "secondary");
  const displayName = name || subtitle || `대상 ${index + 1}`;

  return {
    id:
      (typeof o.id === "string" && o.id.trim().slice(0, 40)) ||
      `r-${index}-${displayName.slice(0, 6)}`,
    shortLabel:
      (typeof o.shortLabel === "string" && o.shortLabel.trim().slice(0, 4)) ||
      displayName.slice(0, 1) ||
      "?",
    name: displayName,
    subtitle: subtitle || displayName,
    role,
    recruitStatus: normalizeRecruitStatus(
      o.recruitStatus ?? o.recruitment_status ?? o.recruitmentStatus,
    ),
    consentReceived: o.consentReceived === true,
    participantCount: Math.min(
      20,
      Math.max(
        1,
        Math.round(
          Number(o.participantCount ?? o.selectedCount ?? o.recommendedCount) ||
            1,
        ),
      ),
    ),
    selectionCriteria: profile.selectionCriteria,
    criterionDetails: profile.criterionDetails,
    reasoning: profile.reasoning,
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

function assignRoles(count: number): RespondentRole[] {
  if (count <= 0) return [];
  if (count === 1) return ["heavy"];
  if (count === 2) return ["heavy", "light"];
  if (count === 3) return ["heavy", "secondary", "light"];
  if (count === 4) return ["heavy", "control", "secondary", "light"];
  // 5+: heavy, light, secondary…, control…
  const roles: RespondentRole[] = ["heavy", "light"];
  const remaining = count - 2;
  const secondaries = Math.max(1, Math.ceil(remaining / 2));
  const controls = remaining - secondaries;
  for (let i = 0; i < secondaries; i++) roles.push("secondary");
  for (let i = 0; i < controls; i++) roles.push("control");
  return roles.slice(0, count);
}

/** 데모/레거시 샘플(식당·카페 등) — CORE 2에서 주제 세그먼트로 교체해야 함 */
const LEGACY_DEMO_LABEL =
  /식당|카페|빵집|박사장|김카페|정빵집|일반 매장|매장 ·|r-park|r-cafe|r-bread|r-control/;

export function isLegacyDemoRespondentSet(respondents: Respondent[]): boolean {
  if (!respondents.length) return false;
  const hits = respondents.filter((r) =>
    LEGACY_DEMO_LABEL.test(`${r.id} ${r.name} ${r.subtitle}`),
  ).length;
  return hits >= Math.max(1, Math.ceil(respondents.length / 2));
}

/** 세그먼트 → Extreme User 응답자 (공유 스키마 유지) */
export function respondentsFromSegments(
  segments: Stage3ResearchSegment[],
): Respondent[] {
  const roles = assignRoles(segments.length);
  return segments.map((seg, index) => {
    const role = seg.role ?? roles[index] ?? "control";
    const label = seg.label.trim() || `세그먼트 ${index + 1}`;
    const reasoning = (seg.reasoning || seg.reason || "").trim();
    return {
      id: seg.id.startsWith("r-") ? seg.id : `r-${seg.id}`,
      shortLabel: label.slice(0, 1) || "?",
      name: label,
      subtitle: label,
      role,
      recruitStatus: "pending" as const,
      consentReceived: false,
      participantCount: Math.max(1, seg.selectedCount || seg.recommendedCount || 1),
      selectionCriteria: [...seg.selectionCriteria],
      criterionDetails: seg.criterionDetails?.length
        ? seg.criterionDetails.map((d) => ({ ...d }))
        : seg.selectionCriteria.map((c) => ({ label: c, why: "" })),
      reasoning,
    };
  });
}

/**
 * prep.segments가 있으면 그걸 CORE 2 정본으로 쓰고,
 * 레거시 데모 respondents는 버린다.
 */
export function resolveExtremeRespondentsForPrep(
  respondents: Respondent[],
  segments: Stage3ResearchSegment[],
): Respondent[] {
  if (!segments.length) {
    return isLegacyDemoRespondentSet(respondents) ? [] : respondents;
  }
  const fromSegments = respondentsFromSegments(segments);
  if (!respondents.length || isLegacyDemoRespondentSet(respondents)) {
    return fromSegments;
  }
  // 사용자가 편집한 카드가 세그먼트와 같은 id 계열이면 병합
  const byId = new Map(respondents.map((r) => [r.id, r]));
  return fromSegments.map((base) => {
    const edited = byId.get(base.id);
    if (!edited) return base;
    // 데모 라벨이 남아 있으면 세그먼트 라벨 우선
    if (LEGACY_DEMO_LABEL.test(`${edited.name} ${edited.subtitle}`)) {
      return base;
    }
    return {
      ...base,
      ...edited,
      role: edited.role || base.role,
      participantCount: Math.max(
        1,
        edited.participantCount || base.participantCount,
      ),
      selectionCriteria: edited.selectionCriteria.length
        ? edited.selectionCriteria
        : base.selectionCriteria,
      criterionDetails: edited.criterionDetails?.length
        ? edited.criterionDetails
        : base.criterionDetails,
      reasoning: edited.reasoning.trim() || base.reasoning,
      subtitle: edited.subtitle.trim() || base.subtitle,
      name: edited.name.trim() || base.name,
      recruitStatus: "pending",
    };
  });
}

/** 응답자 → 세그먼트 (인원·선정 기준 동기화) */
export function segmentsFromRespondents(
  respondents: Respondent[],
  previous?: Stage3ResearchSegment[],
): Stage3ResearchSegment[] {
  const prevById = new Map((previous ?? []).map((s) => [s.id, s]));
  return respondents.map((r, index) => {
    const segId = r.id.startsWith("r-") ? r.id.slice(2) || r.id : r.id;
    const prev = prevById.get(segId) ?? prevById.get(r.id);
    const count = Math.max(1, r.participantCount || prev?.selectedCount || 1);
    return {
      id: prev?.id ?? segId,
      label: r.subtitle.trim() || r.name.trim() || `대상 ${index + 1}`,
      recommendedCount: prev?.recommendedCount ?? count,
      selectedCount: count,
      selectionCriteria: [...(r.selectionCriteria ?? [])],
      criterionDetails: (r.criterionDetails?.length
        ? r.criterionDetails
        : (r.selectionCriteria ?? []).map((label) => ({ label, why: "" }))
      ).map((d) => ({ ...d })),
      reasoning: r.reasoning ?? "",
      reason: r.reasoning ?? "",
      role: r.role,
    };
  });
}

export function mergeSessionsForRespondents(
  respondents: Respondent[],
  prevSessions: Record<string, RespondentSession>,
): Record<string, RespondentSession> {
  const next: Record<string, RespondentSession> = {};
  for (const r of respondents) {
    next[r.id] = prevSessions[r.id] ?? emptySession();
  }
  return next;
}
