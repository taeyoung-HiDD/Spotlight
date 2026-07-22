"use client";

import { EmpathyQuadrantPostits } from "@/components/stage/stage4/EmpathyQuadrantPostits";
import { PersonaBioFields } from "@/components/stage/stage4/PersonaBioFields";
import { PersonaThumbnailField } from "@/components/stage/stage4/PersonaThumbnailField";
import { VirtualPersonaProfileCard } from "@/components/stage/stage4/VirtualPersonaProfileCard";
import type { NemotronPersonaProfile } from "@/lib/personas/nemotronPersona";
import {
  EMPATHY_QUADRANTS,
  type EmpathyQuadrantId,
  type EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";
import type { PersonaBio } from "@/lib/stages/stage4/personaBio";

interface EmpathyPostitBoardProps {
  quadrants: Record<EmpathyQuadrantId, EmpathyStickyItem[]>;
  onChange: (
    quadrantId: EmpathyQuadrantId,
    items: EmpathyStickyItem[],
  ) => void;
  personaName: string;
  personaContext: string;
  personaBio: PersonaBio;
  /** 매칭된 Nemotron 가상 사용자 (있으면 배경 카드 표시) */
  personaProfile?: NemotronPersonaProfile;
  onBioChange?: (bio: PersonaBio) => void;
  onBioAiGenerate?: () => void;
  bioAiLoading?: boolean;
  bioEditable?: boolean;
  /** false면 Bio 입력은 상단 상세에서만 (중복 방지) */
  showBioFields?: boolean;
  personaThumbnailUrl: string;
  onThumbnailChange: (url: string) => void;
  mapId: string;
}

export function EmpathyPostitBoard({
  quadrants,
  onChange,
  personaName,
  personaContext,
  personaBio,
  personaProfile,
  onBioChange,
  onBioAiGenerate,
  bioAiLoading = false,
  bioEditable = true,
  showBioFields = true,
  personaThumbnailUrl,
  onThumbnailChange,
  mapId,
}: EmpathyPostitBoardProps) {
  const displayName = personaBio.name.trim() || personaName.trim() || "페르소나";
  const subtitle = personaContext.trim();

  return (
    <div className="empathy-map-board">
      {showBioFields && onBioChange ? (
        <PersonaBioFields
          bio={personaBio}
          onChange={onBioChange}
          onAiGenerate={onBioAiGenerate}
          aiLoading={bioAiLoading}
          editable={bioEditable}
          mapId={mapId}
        />
      ) : null}

      {showBioFields && personaProfile ? (
        <VirtualPersonaProfileCard profile={personaProfile} />
      ) : null}

      <h3
        className={[
          "empathy-map-title break-keep",
          showBioFields ? "mt-5" : "",
        ].join(" ")}
      >
        {displayName}
      </h3>
      {subtitle ? (
        <p className="empathy-map-subtitle break-keep">{subtitle}</p>
      ) : null}

      <div className="empathy-map-grid-wrap">
        <div
          className="empathy-map-grid"
          role="group"
          aria-label={`${displayName} 공감맵 4분면`}
        >
          {EMPATHY_QUADRANTS.map((q) => (
            <div
              key={q.id}
              className={`empathy-map-quadrant empathy-map-quadrant--${q.id}`}
            >
              <EmpathyQuadrantPostits
                variant="quadrant"
                quadrantId={q.id}
                labelEn={q.labelEn}
                labelKo={q.labelKo}
                description={q.description}
                items={quadrants[q.id]}
                onChange={(items) => onChange(q.id, items)}
              />
            </div>
          ))}
        </div>

        <div className="empathy-map-center">
          <PersonaThumbnailField
            variant="center"
            name={displayName}
            context={subtitle}
            thumbnailUrl={personaThumbnailUrl}
            onThumbnailChange={onThumbnailChange}
          />
        </div>
      </div>
    </div>
  );
}
