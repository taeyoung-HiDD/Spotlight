"use client";

import { IconPlus, IconRoute } from "@tabler/icons-react";
import { StartProjectButton } from "@/components/project/StartProjectButton";
import { stageBtnPrimary } from "@/lib/stages/ui";

export function HomeNewProject() {
  return (
    <section className="mb-3.5 rounded-[14px] border border-border-warm bg-white p-[22px]">
      <div className="mb-[15px] flex items-center gap-[9px]">
        <IconRoute className="size-[15px] text-charcoal" stroke={1.75} />
        <div>
          <h2 className="text-[13px] font-medium text-charcoal">
            새 프로젝트 시작
          </h2>
          <p className="mt-0.5 text-[10.5px] text-muted">
            코칭 방식을 고른 뒤 문제 정의부터 함께 진행해요
          </p>
        </div>
      </div>

      <StartProjectButton
        className={`${stageBtnPrimary} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
      >
        <IconPlus className="size-4" stroke={2} aria-hidden />
        새 프로젝트 만들기
      </StartProjectButton>
    </section>
  );
}
