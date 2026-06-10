import { IconBookmarkFilled, IconChevronRight } from "@tabler/icons-react";
import {
  StageProgressBar,
  type StageDotTone,
} from "@/components/home/StageProgressBar";

interface CoachNote {
  label: string;
  body: string;
  variant: "milestone" | "regression";
}

interface ProjectCardData {
  title: string;
  meta: string;
  subtitle: string;
  progress: StageDotTone[];
  coachNote: CoachNote;
  featured?: boolean;
  badge?: string;
}

const PROJECTS: ProjectCardData[] = [
  {
    title: "안심 매대",
    meta: "30일째 · 오늘",
    subtitle: "단계 12 로드맵 · 마지막 작업 어제 21:14",
    featured: true,
    badge: "마일스톤 도래",
    progress: [
      "spotlight",
      "spotlight",
      "spotlight",
      "spotlight",
      "spotlight-dim",
      "spotlight-dim",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
    ],
    coachNote: {
      variant: "milestone",
      label: "코치가 함께 봐드릴 자리",
      body: "30일 마일스톤 결과 입력 후 — 통과면 다음 시기로, 미달이면 단계 4 회귀.",
    },
  },
  {
    title: "매장 인사 인공지능",
    meta: "단계 3 · 5일 전",
    subtitle: "리서치 응답자 모집 중 · 진전 멈춤",
    progress: [
      "workbook",
      "workbook",
      "workbook-dim",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
    ],
    coachNote: {
      variant: "regression",
      label: "코치 회귀 권고",
      body: "5일째 멈춤 · 단계 2 리서치 방법 재검토 권장",
    },
  },
];

function ProjectCard({ project }: { project: ProjectCardData }) {
  const isMilestone = project.coachNote.variant === "milestone";

  return (
    <article
      className={[
        "relative rounded-[11px] p-4",
        project.featured
          ? "border-[1.5px] border-spotlight bg-highlight"
          : "border border-border-warm bg-white",
      ].join(" ")}
    >
      {project.badge && (
        <span className="absolute -top-2 right-3.5 rounded bg-spotlight px-[7px] py-0.5 text-[9px] font-medium tracking-[0.3px] text-charcoal">
          {project.badge}
        </span>
      )}

      <div className="mb-[7px] flex items-center justify-between">
        <h3
          className={[
            "text-[13.5px] text-charcoal",
            project.featured ? "font-semibold" : "font-medium",
          ].join(" ")}
        >
          {project.title}
        </h3>
        <span
          className={[
            "rounded px-[7px] py-0.5 text-[9.5px] font-medium",
            project.featured
              ? "bg-yellow-tint text-gold"
              : "bg-cream text-muted",
          ].join(" ")}
        >
          {project.meta}
        </span>
      </div>

      <p className="mb-2 text-[10.5px] leading-normal text-muted">
        {project.subtitle}
      </p>

      <StageProgressBar tones={project.progress} />

      <div
        className={[
          "mb-2 rounded-[7px] border px-2.5 py-2",
          isMilestone
            ? "border-spotlight bg-white"
            : "border-border-warm bg-cream",
        ].join(" ")}
      >
        <p
          className={[
            "mb-0.5 text-[9.5px] font-medium tracking-[0.3px]",
            isMilestone ? "text-gold" : "text-muted",
          ].join(" ")}
        >
          {project.coachNote.label}
        </p>
        <p
          className={[
            "leading-normal text-charcoal",
            isMilestone ? "text-[11px] leading-normal" : "text-[10.5px]",
          ].join(" ")}
        >
          {project.coachNote.body}
        </p>
      </div>

      <div className="flex gap-[5px]">
        <button
          type="button"
          className="flex-1 rounded-md bg-spotlight py-[7px] text-center text-[11px] font-medium text-on-spotlight"
        >
          이어서 진행
        </button>
        <button
          type="button"
          className="rounded-md border border-border-warm bg-white px-2.5 py-[7px] text-center text-[11px] text-charcoal"
        >
          자료실
        </button>
      </div>
    </article>
  );
}

export function HomeContinueProjects() {
  return (
    <section
      id="projects"
      className="mb-3.5 rounded-[14px] border border-border-warm bg-white p-[22px]"
    >
      <div className="mb-[15px] flex items-center justify-between">
        <div className="flex items-center gap-[9px]">
          <IconBookmarkFilled className="size-[15px] text-spotlight" stroke={0} />
          <div>
            <h2 className="text-[13px] font-medium text-charcoal">
              프로젝트 계속 진행
            </h2>
            <p className="mt-0.5 text-[10.5px] text-muted">
              이전에 작업하던 자리에서 바로 이어가기
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-[5px] text-[10.5px] text-muted transition-colors hover:text-charcoal"
        >
          전체 보기 · 3
          <IconChevronRight className="size-[11px]" stroke={2} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
