"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createProjectFromEntryPoint } from "@/lib/projects/createProject";
import type { EntryPointId } from "@/lib/projects/constants";

interface StartProjectButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children: ReactNode;
  entryPoint?: EntryPointId;
}

export function StartProjectButton({
  children,
  entryPoint = "A",
  disabled,
  className,
  ...rest
}: StartProjectButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (entryPoint !== "A") {
      return;
    }

    setLoading(true);
    try {
      const { projectId, startStage } =
        await createProjectFromEntryPoint(entryPoint);
      router.push(`/project/${projectId}/stage/${startStage}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "프로젝트 생성에 실패했습니다.";
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }, [entryPoint, router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      aria-busy={loading}
      {...rest}
    >
      {loading ? "프로젝트 만드는 중…" : children}
    </button>
  );
}
