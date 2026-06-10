"use client";

import { EmpathyQuadrantPostits } from "@/components/stage/stage4/EmpathyQuadrantPostits";
import { PersonaThumbnailField } from "@/components/stage/stage4/PersonaThumbnailField";
import {
  EMPATHY_QUADRANTS,
  type EmpathyQuadrantId,
  type EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";

interface EmpathyPostitBoardProps {
  quadrants: Record<EmpathyQuadrantId, EmpathyStickyItem[]>;
  onChange: (
    quadrantId: EmpathyQuadrantId,
    items: EmpathyStickyItem[],
  ) => void;
  personaName: string;
  personaContext: string;
  personaThumbnailUrl: string;
  onThumbnailChange: (url: string) => void;
}

export function EmpathyPostitBoard({
  quadrants,
  onChange,
  personaName,
  personaContext,
  personaThumbnailUrl,
  onThumbnailChange,
}: EmpathyPostitBoardProps) {
  const displayName = personaName.trim() || "페르소나";

  return (
    <div className="empathy-map-board">
      <h3 className="empathy-map-title break-keep">
        Empathy Map: {displayName}
      </h3>
      {personaContext.trim() ? (
        <p className="empathy-map-subtitle break-keep">{personaContext}</p>
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
            name={personaName}
            context={personaContext}
            thumbnailUrl={personaThumbnailUrl}
            onThumbnailChange={onThumbnailChange}
          />
        </div>
      </div>
    </div>
  );
}
