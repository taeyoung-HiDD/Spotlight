"use client";

import type { ReactNode } from "react";
import { ArchiveStage1View } from "@/components/archive/ArchiveStage1View";
import { ArchiveViewProvider } from "@/lib/archive/archiveViewContext";
import { Stage2PrePmfOverview } from "@/components/stage/stage2/Stage2PrePmfOverview";
import { Stage3FieldResearch } from "@/components/stage/stage3/Stage3FieldResearch";
import { Stage4Discoveries } from "@/components/stage/stage4/Stage4Discoveries";
import { Stage5Iceberg } from "@/components/stage/stage5/Stage5Iceberg";
import { Stage6UserJourney } from "@/components/stage/stage6/Stage6UserJourney";
import { Stage7Hmw } from "@/components/stage/stage7/Stage7Hmw";
import { Stage8Ideation } from "@/components/stage/stage8/Stage8Ideation";
import { Stage9ConceptSheet } from "@/components/stage/stage9/Stage9ConceptSheet";
import { Stage10Prototype } from "@/components/stage/stage10/Stage10Prototype";
import { useT } from "@/hooks/useT";
import { stageCaption, stagePanel } from "@/lib/stages/ui";

interface ArchiveStageContentProps {
  projectId: string;
  stageId: number;
}

function ArchiveStageUnsupported({ stageId }: { stageId: number }) {
  const t = useT();
  return (
    <section className={stagePanel}>
      <p className={stageCaption}>
        {t("archive.unsupported", { stageId })}
      </p>
    </section>
  );
}

export function ArchiveStageContent({
  projectId,
  stageId,
}: ArchiveStageContentProps) {
  let content: ReactNode;

  switch (stageId) {
    case 1:
      content = <ArchiveStage1View projectId={projectId} />;
      break;
    case 2:
      content = <Stage2PrePmfOverview projectId={projectId} />;
      break;
    case 3:
      content = <Stage3FieldResearch projectId={projectId} />;
      break;
    case 4:
      content = <Stage4Discoveries projectId={projectId} />;
      break;
    case 5:
      content = <Stage6UserJourney projectId={projectId} />;
      break;
    case 6:
      content = <Stage5Iceberg projectId={projectId} />;
      break;
    case 7:
      content = <Stage7Hmw projectId={projectId} />;
      break;
    case 8:
      content = <Stage8Ideation projectId={projectId} />;
      break;
    case 10:
      content = <Stage9ConceptSheet projectId={projectId} />;
      break;
    case 11:
      content = <Stage10Prototype projectId={projectId} />;
      break;
    default:
      content = <ArchiveStageUnsupported stageId={stageId} />;
  }

  return (
    <ArchiveViewProvider>
      <div className="archive-artifact-detail">{content}</div>
    </ArchiveViewProvider>
  );
}
