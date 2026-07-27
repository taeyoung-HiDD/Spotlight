"use client";

import { useMemo, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconHelp } from "@tabler/icons-react";
import { EXTREME_ROLE_HINT, EXTREME_ROLE_LABEL } from "@/lib/stages/fieldResearch/extremeUserRole";
import {
  demographicSpecificityCoachPrompt,
  isDemographicOnlyLabel,
  suggestHypothesesForTarget,
  type SegmentationHypothesis,
} from "@/lib/stages/fieldResearch/selectionProfile";
import type { Respondent, RespondentRole } from "@/lib/stages/fieldResearch/types";
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";
import {
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
} from "@/lib/stages/ui";

interface ExtremeUserSelectionBoardProps {
  respondents: Respondent[];
  problem: string;
  coachingLevel: UserCoachingLevel;
  editable?: boolean;
  onChange: (respondents: Respondent[]) => void;
  onCoachNudge?: (message: string) => void;
}

const SPECTRUM_ROLES: RespondentRole[] = ["heavy", "control", "light"];

function roleCardClass(role: RespondentRole): string {
  if (role === "control") {
    return "border border-dashed border-[#A09E94] bg-panel/80 opacity-90";
  }
  if (role === "secondary") {
    return "border border-spotlight/40 bg-[#FFFDF4]/70";
  }
  return "border-[1.5px] border-spotlight bg-[#FFFDF4]";
}

function ExtremeUserCard({
  respondent,
  problem,
  coachingLevel,
  editable,
  showHypotheses,
  onToggleHelp,
  onChange,
  onAdoptHypothesis,
  onDemographicBlur,
}: {
  respondent: Respondent;
  problem: string;
  coachingLevel: UserCoachingLevel;
  editable: boolean;
  showHypotheses: boolean;
  onToggleHelp: () => void;
  onChange: (next: Respondent) => void;
  onAdoptHypothesis: (hyp: SegmentationHypothesis) => void;
  onDemographicBlur: (label: string) => void;
}) {
  const title = respondent.subtitle || respondent.name;
  const criteria = respondent.selectionCriteria ?? [];
  const details = respondent.criterionDetails?.length
    ? respondent.criterionDetails
    : criteria.map((label) => ({ label, why: "" }));
  const reasoning = respondent.reasoning ?? "";
  const hypotheses = useMemo(
    () => suggestHypothesesForTarget(problem, respondent.role, title),
    [problem, respondent.role, title],
  );
  const needsHypothesis =
    editable &&
    (showHypotheses ||
      (coachingLevel === "beginner" &&
        (!criteria.length || !reasoning.trim() || details.every((d) => !d.why))));

  return (
    <article className={`rounded-[10px] px-3 py-2.5 ${roleCardClass(respondent.role)}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-wide text-gold">
          {EXTREME_ROLE_LABEL[respondent.role]}
        </p>
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          인원
          <input
            type="number"
            min={1}
            max={20}
            value={respondent.participantCount ?? 1}
            disabled={!editable}
            onChange={(e) =>
              onChange({
                ...respondent,
                participantCount: Math.min(
                  20,
                  Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                ),
              })
            }
            className={`w-14 rounded-md border border-border-warm bg-panel px-1.5 py-1 text-center text-[13px] font-semibold text-foreground ${stageInput}`}
          />
          명
        </label>
      </div>

      {editable ? (
        <input
          type="text"
          value={title}
          onChange={(e) =>
            onChange({
              ...respondent,
              subtitle: e.target.value,
              name: e.target.value || respondent.name,
            })
          }
          onBlur={(e) => onDemographicBlur(e.target.value)}
          placeholder="특성 한 줄 (예: 자취·부모 지원 거의 없음)"
          className={`mt-1 w-full rounded-md border border-border-warm bg-panel px-2 py-1.5 text-[13px] font-semibold text-foreground ${stageInput}`}
        />
      ) : (
        <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground break-keep">
          {title}
        </p>
      )}

      {details.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          <li className="text-[10px] font-semibold text-muted">선정 기준</li>
          {details.map((d) => (
            <li
              key={`${respondent.id}-${d.label}`}
              className="rounded-md border border-border-warm bg-panel px-2 py-1.5"
            >
              <span className="inline-block rounded bg-cream px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                {d.label}
              </span>
              {d.why ? (
                <p className="mt-1 text-[12px] leading-snug text-[#6B6A66] break-keep">
                  {d.why}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-muted">
                  이 대상에 이 기준이 붙은 이유를 보완해 주세요.
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {reasoning ? (
        <p className="mt-2 rounded-md bg-panel/70 px-2 py-1.5 text-[12.5px] leading-relaxed text-[#6B6A66] break-keep">
          <span className="font-semibold text-gold">왜 이 유형인가요? </span>
          {reasoning}
        </p>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-muted break-keep">
          유형 선정 이유가 아직 없어요.
        </p>
      )}

      {editable && coachingLevel === "expert" ? (
        <div className="mt-2 space-y-1.5">
          <textarea
            rows={2}
            value={criteria.join(", ")}
            onChange={(e) => {
              const labels = e.target.value
                .split(/[,，、]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 5);
              const prevWhy = new Map(
                (respondent.criterionDetails ?? []).map((d) => [d.label, d.why]),
              );
              onChange({
                ...respondent,
                selectionCriteria: labels,
                criterionDetails: labels.map((label) => ({
                  label,
                  why: prevWhy.get(label) ?? "",
                })),
              });
            }}
            placeholder="선정 기준을 쉼표로 구분해 직접 적어요"
            className={`w-full rounded-md border border-border-warm bg-cream px-2 py-1.5 text-[12px] ${stageField}`}
          />
          <textarea
            rows={3}
            value={reasoning}
            onChange={(e) =>
              onChange({ ...respondent, reasoning: e.target.value })
            }
            placeholder="왜 이 유형을 골랐는지 적어 주세요"
            className={`w-full rounded-md border border-border-warm bg-cream px-2 py-1.5 text-[12.5px] text-[#6B6A66] ${stageField}`}
          />
          <button
            type="button"
            onClick={onToggleHelp}
            className={`${stageBtnSecondary} inline-flex items-center gap-1 px-2 py-1 text-[11px]`}
          >
            <IconHelp className="size-3.5" stroke={2} aria-hidden />
            도움 받기
          </button>
        </div>
      ) : null}

      {needsHypothesis ? (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] font-semibold text-muted">
            이 유형용 선정 기준 가설
            <span className="ml-1 rounded bg-highlight px-1 py-0.5 text-[10px] text-gold">
              가설
            </span>
          </p>
          {hypotheses.map((hyp) => (
            <button
              key={hyp.id}
              type="button"
              onClick={() => onAdoptHypothesis(hyp)}
              className="block w-full rounded-md border border-border-warm bg-panel px-2 py-1.5 text-left hover:border-spotlight/40"
            >
              <span className="text-[12px] font-semibold text-foreground break-keep">
                {hyp.label}
              </span>
              <ul className="mt-1 space-y-1">
                {hyp.criterionDetails.map((d) => (
                  <li key={d.label} className="text-[11px] leading-snug text-muted break-keep">
                    <span className="font-semibold text-foreground">{d.label}</span>
                    {" — "}
                    {d.why}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ExtremeUserSelectionBoard({
  respondents,
  problem,
  coachingLevel,
  editable = true,
  onChange,
  onCoachNudge,
}: ExtremeUserSelectionBoardProps) {
  const [helpForId, setHelpForId] = useState<string | null>(null);

  const byRole = useMemo(() => {
    const map: Record<RespondentRole, Respondent[]> = {
      heavy: [],
      light: [],
      control: [],
      secondary: [],
    };
    for (const r of respondents) {
      map[r.role]?.push(r);
    }
    return map;
  }, [respondents]);

  const total = respondents.reduce(
    (sum, r) => sum + Math.max(0, r.participantCount || 0),
    0,
  );

  const patch = (id: string, next: Respondent) => {
    onChange(respondents.map((r) => (r.id === id ? next : r)));
  };

  const adopt = (id: string, hyp: SegmentationHypothesis) => {
    const current = respondents.find((r) => r.id === id);
    if (!current) return;
    patch(id, {
      ...current,
      subtitle: hyp.label,
      name: hyp.label,
      selectionCriteria: [...hyp.selectionCriteria],
      criterionDetails: hyp.criterionDetails.map((d) => ({ ...d })),
      reasoning: hyp.reasoning,
    });
  };

  const renderCard = (r: Respondent) => (
    <ExtremeUserCard
      key={r.id}
      respondent={r}
      problem={problem}
      coachingLevel={coachingLevel}
      editable={editable}
      showHypotheses={helpForId === r.id}
      onToggleHelp={() =>
        setHelpForId((prev) => (prev === r.id ? null : r.id))
      }
      onChange={(next) => patch(r.id, next)}
      onAdoptHypothesis={(hyp) => adopt(r.id, hyp)}
      onDemographicBlur={(label) => {
        if (!isDemographicOnlyLabel(label)) return;
        onCoachNudge?.(demographicSpecificityCoachPrompt(problem));
      }}
    />
  );

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={stageLabel}>사용·경험 스펙트럼 · 극단 사용자</p>
        <p className={stageCaption}>
          1순위 Heavy ↔ Light · 합계 {total}명
        </p>
      </div>

      <div className="relative rounded-xl border border-border-warm bg-panel px-3 pb-3 pt-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <IconArrowLeft className="size-3.5 text-muted" stroke={2} aria-hidden />
          <div className="relative h-0.5 flex-1 rounded-full bg-border-warm">
            <span className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-muted" />
            <span className="absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-muted" />
          </div>
          <IconArrowRight className="size-3.5 text-muted" stroke={2} aria-hidden />
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {SPECTRUM_ROLES.map((role) => (
            <div key={role} className="min-w-0 space-y-2">
              {byRole[role].map(renderCard)}
              {!byRole[role].length ? (
                <div
                  className={`rounded-[10px] px-3 py-4 text-center text-[12px] text-muted ${roleCardClass(role)}`}
                >
                  {EXTREME_ROLE_LABEL[role]} 자리
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-warm bg-cream/40 px-3 py-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className={stageLabel}>2순위 후보 그룹</p>
            <p className={`mt-0.5 ${stageCaption}`}>
              양 극단(1순위) 다음으로 면접·관찰할 가치가 큰 대상이에요. 인원을
              조정해 포함할지 정해 보세요.
            </p>
          </div>
          <p className={stageCaption}>
            {byRole.secondary.length
              ? `${byRole.secondary.reduce((s, r) => s + (r.participantCount || 0), 0)}명`
              : "아직 없음"}
          </p>
        </div>
        {byRole.secondary.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {byRole.secondary.map(renderCard)}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border-warm bg-panel px-3 py-4 text-center text-[13px] text-muted break-keep">
            {EXTREME_ROLE_HINT.secondary}. 추천을 다시 만들면 2순위 후보가 채워져요.
          </p>
        )}
      </div>

      <p className="rounded-lg border border-spotlight/40 bg-[#FFFDF4] px-3 py-2 text-[12.5px] italic leading-relaxed text-foreground break-keep">
        극단에서 보편을 본다 — 양 끝을 먼저 잡고, 2순위 후보로 패턴을 보완한다.
      </p>
    </div>
  );
}
