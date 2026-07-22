"use client";

import { useEffect, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { fetchStage1CollectState } from "@/lib/artifacts/stage1Collect";
import { useT } from "@/hooks/useT";
import {
  stageCaption,
  stagePanel,
  stageSectionTitle,
  stageWorkDense,
} from "@/lib/stages/ui";

interface ArchiveStage1ViewProps {
  projectId: string;
}

export function ArchiveStage1View({ projectId }: ArchiveStage1ViewProps) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [startingPoint, setStartingPoint] = useState("");
  const [projectTitle, setProjectTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchStage1CollectState(projectId)
      .then(({ state }) => {
        if (cancelled) return;
        setStartingPoint(state.startingPoint.trim());
        setProjectTitle(state.projectTitle.trim());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-warm bg-panel px-6 py-12 text-center text-[16px] text-muted">
        {t("common.loading")}
      </div>
    );
  }

  if (!startingPoint && !projectTitle) {
    return (
      <section className={stagePanel}>
        <p className={stageCaption}>{t("archive.noSummary")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {projectTitle ? (
        <section className={stagePanel}>
          <h2 className={stageSectionTitle}>
            <LocalizedText>프로젝트 이름</LocalizedText>
          </h2>
          <p className={`mt-2 ${stageWorkDense} break-keep`}>
            <LocalizedText>{projectTitle}</LocalizedText>
          </p>
        </section>
      ) : null}
      {startingPoint ? (
        <section className={stagePanel}>
          <h2 className={stageSectionTitle}>
            <LocalizedText>풀고자 하는 문제</LocalizedText>
          </h2>
          <p className={`mt-2 whitespace-pre-wrap ${stageWorkDense} break-keep`}>
            <LocalizedText>{startingPoint}</LocalizedText>
          </p>
        </section>
      ) : null}
    </div>
  );
}
