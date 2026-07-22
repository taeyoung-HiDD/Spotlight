"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { useUiLocale } from "@/hooks/useUiLocale";
import {
  nemotronProfileDemographics,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";
import { stageLabel } from "@/lib/stages/ui";

interface VirtualPersonaProfileCardProps {
  profile: NemotronPersonaProfile;
}

const DETAIL_FIELDS: Array<{
  key: keyof NemotronPersonaProfile;
  labelKo: string;
  labelEn: string;
}> = [
  {
    key: "professionalPersona",
    labelKo: "직업 생활",
    labelEn: "Work life",
  },
  {
    key: "familyPersona",
    labelKo: "가족·일상",
    labelEn: "Family & daily life",
  },
  {
    key: "culturalBackground",
    labelKo: "문화적 배경",
    labelEn: "Cultural background",
  },
  {
    key: "skillsAndExpertise",
    labelKo: "역량",
    labelEn: "Skills",
  },
  {
    key: "hobbiesAndInterests",
    labelKo: "취미·관심사",
    labelEn: "Hobbies & interests",
  },
  {
    key: "careerGoalsAndAmbitions",
    labelKo: "목표·야망",
    labelEn: "Goals & ambitions",
  },
];

/** Nemotron-Personas-Korea에서 매칭된 가상 사용자 배경 카드 */
export function VirtualPersonaProfileCard({
  profile,
}: VirtualPersonaProfileCardProps) {
  const locale = useUiLocale();
  const demographics = nemotronProfileDemographics(profile);
  const details = DETAIL_FIELDS.map((field) => ({
    ...field,
    value: (profile[field.key] ?? "").toString().trim(),
  })).filter((field) => field.value);

  return (
    <div className="mt-3 rounded-xl border border-border-warm bg-cream/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={stageLabel}>
          {locale === "en" ? "Virtual user profile" : "가상 사용자 프로필"}
        </p>
        <span className="rounded-full border border-border-warm bg-panel px-2 py-0.5 text-[11px] font-medium text-muted">
          {locale === "en"
            ? "Korea demography · Nemotron-Personas-Korea"
            : "한국 인구 통계 기반 · Nemotron-Personas-Korea"}
        </span>
      </div>
      {demographics ? (
        <p className="mt-2 text-[14px] font-semibold text-foreground break-keep">
          <LocalizedText>{demographics}</LocalizedText>
        </p>
      ) : null}
      {profile.persona ? (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted break-keep">
          <LocalizedText>{profile.persona}</LocalizedText>
        </p>
      ) : null}
      {details.length ? (
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[13px] font-medium text-gold">
            {locale === "en"
              ? "See more about this person"
              : "이 인물의 배경 자세히 보기"}
          </summary>
          <dl className="mt-2 space-y-2">
            {details.map((field) => (
              <div key={field.key}>
                <dt className="text-[12px] font-semibold text-muted">
                  {locale === "en" ? field.labelEn : field.labelKo}
                </dt>
                <dd className="mt-0.5 text-[13px] leading-relaxed text-foreground break-keep">
                  <LocalizedText>{field.value}</LocalizedText>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      <p className="mt-2.5 text-[12px] text-muted break-keep">
        {locale === "en"
          ? "Not a real person—a synthetic profile matched to demographic distributions. The persona thinks and answers like this background suggests."
          : "실제 인물이 아니라, 통계 분포에 맞춰 합성된 가상 인물이에요. 이 배경을 바탕으로 페르소나가 실제 사람처럼 생각하고 답변합니다."}
      </p>
    </div>
  );
}
