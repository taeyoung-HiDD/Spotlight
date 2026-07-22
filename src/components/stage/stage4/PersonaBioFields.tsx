"use client";

import { IconSparkles } from "@tabler/icons-react";
import { LocalizedEditableInput } from "@/components/i18n/LocalizedEditableField";
import type { PersonaBio } from "@/lib/stages/stage4/personaBio";
import { stageField, stageInput, stageLabel } from "@/lib/stages/ui";

interface PersonaBioFieldsProps {
  bio: PersonaBio;
  onChange: (bio: PersonaBio) => void;
  onAiGenerate?: () => void;
  aiLoading?: boolean;
  editable?: boolean;
  mapId: string;
}

const FIELDS: Array<{
  key: keyof PersonaBio;
  label: string;
  placeholder: string;
}> = [
  { key: "name", label: "이름", placeholder: "예: 민지" },
  { key: "age", label: "나이", placeholder: "예: 34세" },
  { key: "occupation", label: "직업", placeholder: "예: 스타트업 마케팅 매니저" },
  {
    key: "familyRelations",
    label: "가족 관계",
    placeholder: "예: 아내와 초등학생 자녀 1명",
  },
];

export function PersonaBioFields({
  bio,
  onChange,
  onAiGenerate,
  aiLoading = false,
  editable = true,
  mapId,
}: PersonaBioFieldsProps) {
  const updateField = (key: keyof PersonaBio, value: string) => {
    onChange({ ...bio, [key]: value });
  };

  return (
    <div className="rounded-xl border border-border-warm bg-cream/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className={stageLabel}>프로필 · Bio</p>
        {editable && onAiGenerate ? (
          <button
            type="button"
            onClick={onAiGenerate}
            disabled={aiLoading}
            className="inline-flex items-center gap-1 rounded-md border border-spotlight/40 bg-highlight px-2.5 py-1.5 text-[13px] font-semibold text-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconSparkles className="size-3.5" stroke={2} aria-hidden />
            {aiLoading ? "Bio 작성 중…" : "AI로 Bio 작성"}
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`persona-bio-${field.key}-${mapId}`}
              className={`mb-1.5 block ${stageLabel}`}
            >
              {field.label}
            </label>
            <LocalizedEditableInput
              id={`persona-bio-${field.key}-${mapId}`}
              value={bio[field.key]}
              onValueChange={(value) => updateField(field.key, value)}
              disabled={!editable || aiLoading}
              placeholder={field.placeholder}
              className={`w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput} disabled:opacity-70`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
