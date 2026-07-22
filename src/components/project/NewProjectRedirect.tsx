"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createProjectFromEntryPoint } from "@/lib/projects/createProject";

/** `/project/new` — 프로젝트 생성 후 단계 1(코칭 방식 선택)으로 이동 */
export function NewProjectRedirect() {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const { projectId, startStage } =
          await createProjectFromEntryPoint("A");
        router.replace(`/project/${projectId}/stage/${startStage}`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "프로젝트 생성에 실패했습니다.";
        window.alert(message);
        router.replace("/home");
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[16px] font-medium text-foreground">
        새 프로젝트를 준비하는 중…
      </p>
      <p className="text-[14px] text-muted">
        잠시만 기다려 주세요. 곧 코칭 방식 선택 화면으로 이동해요.
      </p>
    </div>
  );
}
