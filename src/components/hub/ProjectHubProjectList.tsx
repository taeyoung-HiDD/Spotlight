"use client";

import {
  IconArrowRight,
  IconBulb,
  IconCircleCheckFilled,
  IconFilter,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { ProjectHubDeleteButton } from "@/components/hub/ProjectHubDeleteButton";
import { ProjectHubInviteButton } from "@/components/hub/ProjectHubInviteButton";
import { ProjectHubParticipantRow } from "@/components/hub/ProjectHubParticipantRow";
import { HubMacroProgressRow } from "@/components/hub/HubMacroProgressRow";
import { HubStageProgressBar } from "@/components/hub/HubStageProgressBar";
import type { HubProjectItem } from "@/lib/projects/fetchHubProjects";
import { STAGE_COUNT } from "@/lib/stages/constants";
import { getSidebarStage } from "@/lib/stages/sidebarNav";

interface ProjectHubProjectListProps {
  userName: string;
  projects: HubProjectItem[];
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  return `${weeks}주 전`;
}

function ProjectCardTitleRow({
  title,
  className = "mb-1.5",
  titleClassName = "m-0 text-[17px] font-bold leading-snug text-foreground",
  prefix,
}: {
  title: string;
  className?: string;
  titleClassName?: string;
  prefix?: ReactNode;
}) {
  return (
    <div className={["flex min-w-0 items-center gap-1.5", className].join(" ")}>
      {prefix}
      <h3 className={`min-w-0 truncate ${titleClassName}`}>{title}</h3>
    </div>
  );
}

function ProjectCardActionColumn({
  project,
  children,
}: {
  project: HubProjectItem;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:min-w-[15rem] sm:items-end">
      <ProjectHubParticipantRow members={project.teamMembers} align="end" />
      {children}
    </div>
  );
}

function ProjectCardActions({
  project,
  onDeleted,
  children,
}: {
  project: HubProjectItem;
  onDeleted: (projectId: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:min-w-[7.5rem] sm:items-end">
      {children}
      <ProjectHubDeleteButton
        projectId={project.id}
        projectTitle={project.title}
        onDeleted={onDeleted}
        disabled={!project.isOwner}
        className="w-full sm:w-auto"
      />
    </div>
  );
}

function ActiveProjectCard({
  project,
  onDeleted,
}: {
  project: HubProjectItem;
  onDeleted: (projectId: string) => void;
}) {
  const stageMeta = getSidebarStage(project.resumeStage);
  const progressPct = Math.round((project.resumeStage / STAGE_COUNT) * 100);

  return (
    <article className="rounded-xl border-[1.5px] border-spotlight bg-panel p-5">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_auto] lg:gap-6">
        <div>
          <ProjectCardTitleRow title={project.title} />
          {project.description ? (
            <p className="mb-3.5 text-[11.5px] leading-[1.55] text-muted">
              {project.description}
            </p>
          ) : null}

          <div className="mb-3">
            <div className="mb-1 flex justify-between">
              <span className="text-[10px] tracking-wide text-muted">진행 자리</span>
              <span className="text-[10.5px] font-semibold text-gold">
                단계 {project.resumeStage} · {progressPct}%
              </span>
            </div>
            <HubMacroProgressRow stage={project.resumeStage} />
            <HubStageProgressBar stage={project.resumeStage} />
            {stageMeta ? (
              <p className="mt-1 text-[10px] text-muted">{stageMeta.navLabel}</p>
            ) : null}
          </div>

          <p className="text-[9.5px] text-muted">
            마지막 활동 {formatRelativeTime(project.updatedAt)}
          </p>
        </div>

        <ProjectCardActionColumn project={project}>
          <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:justify-end">
            <ProjectHubInviteButton
              projectId={project.id}
              projectTitle={project.title}
            />
            <Link
              href={`/project/${project.id}/stage/${project.resumeStage}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-hub-cta-bg px-4 py-2 text-xs font-medium text-hub-cta-fg transition-opacity hover:opacity-90 sm:w-auto"
            >
              계속 진행
              <IconArrowRight className="size-[13px] text-hub-cta-icon" stroke={2} />
            </Link>
            <ProjectHubDeleteButton
              projectId={project.id}
              projectTitle={project.title}
              onDeleted={onDeleted}
              disabled={!project.isOwner}
            />
          </div>
        </ProjectCardActionColumn>
      </div>
    </article>
  );
}

function PausedProjectCard({
  project,
  onDeleted,
}: {
  project: HubProjectItem;
  onDeleted: (projectId: string) => void;
}) {
  const progressPct = Math.round((project.resumeStage / STAGE_COUNT) * 100);

  return (
    <article className="grid grid-cols-1 items-center gap-4 rounded-xl border border-border-warm bg-panel px-[18px] py-3.5 opacity-80 sm:grid-cols-[1fr_auto]">
      <div>
        <ProjectCardTitleRow
          title={project.title}
          className="mb-1"
          titleClassName="m-0 text-sm font-semibold text-foreground"
        />
        <p className="mb-2 text-[10.5px] leading-normal text-muted">
          단계 {project.resumeStage}에서 보류 · 마지막 활동{" "}
          {formatRelativeTime(project.updatedAt)}
        </p>
        <div className="max-w-md">
          <HubMacroProgressRow stage={project.resumeStage} />
          <HubStageProgressBar stage={project.resumeStage} />
          <p className="mt-1 text-[9.5px] text-muted">
            단계 {project.resumeStage}/{STAGE_COUNT} · {progressPct}%
          </p>
        </div>
      </div>
      <ProjectCardActions project={project} onDeleted={onDeleted}>
        <ProjectHubParticipantRow
          members={project.teamMembers}
          align="end"
          compact
        />
        <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row">
          <ProjectHubInviteButton
            projectId={project.id}
            projectTitle={project.title}
            variant="secondary"
          />
          <Link
            href={`/project/${project.id}/stage/${project.resumeStage}`}
            className="w-full rounded-md border border-border-warm bg-panel px-3 py-1.5 text-center text-[10.5px] text-foreground sm:w-auto"
          >
            다시 시작
          </Link>
        </div>
      </ProjectCardActions>
    </article>
  );
}

function CompletedProjectCard({
  project,
  onDeleted,
}: {
  project: HubProjectItem;
  onDeleted: (projectId: string) => void;
}) {
  return (
    <article className="grid grid-cols-1 items-center gap-4 rounded-xl border border-border-warm bg-panel px-[18px] py-3.5 sm:grid-cols-[1fr_auto]">
      <div>
        <ProjectCardTitleRow
          title={project.title}
          className="mb-1"
          titleClassName="m-0 text-sm font-semibold text-foreground"
          prefix={
            <IconCircleCheckFilled
              className="size-[14px] shrink-0 text-foreground"
              stroke={1.75}
            />
          }
        />
        <p className="text-[10.5px] leading-normal text-muted">
          14 단계 완주 · {formatRelativeTime(project.updatedAt)}
        </p>
      </div>
      <ProjectCardActions project={project} onDeleted={onDeleted}>
        <ProjectHubParticipantRow
          members={project.teamMembers}
          align="end"
          compact
        />
        <div className="flex w-full flex-wrap justify-end gap-1 sm:w-auto">
          <ProjectHubInviteButton
            projectId={project.id}
            projectTitle={project.title}
            variant="secondary"
          />
          <Link
            href={`/project/${project.id}/archive`}
            className="rounded-md border border-border-warm bg-panel px-2.5 py-1.5 text-[10.5px] text-foreground"
          >
            자료실
          </Link>
          <button
            type="button"
            className="rounded-md border border-border-warm bg-panel px-2.5 py-1.5 text-[10.5px] text-foreground"
          >
            회고 보기
          </button>
        </div>
      </ProjectCardActions>
    </article>
  );
}

function SectionHeader({
  dotClass,
  labelClass,
  title,
}: {
  dotClass: string;
  labelClass: string;
  title: string;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      <div className={`size-2 rounded-full ${dotClass}`} />
      <div className={`text-[11px] font-semibold tracking-wide uppercase ${labelClass}`}>
        {title}
      </div>
    </div>
  );
}

export function ProjectHubProjectList({
  userName,
  projects: initialProjects,
}: ProjectHubProjectListProps) {
  const [projects, setProjects] = useState(initialProjects);

  const handleDeleted = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const active = projects.filter((p) => p.status === "active");
  const paused = projects.filter((p) => p.status === "archived");
  const completed = projects.filter((p) => p.status === "completed");

  const summaryParts = [
    `진행 ${active.length}`,
    `보류 ${paused.length}`,
    `완료 ${completed.length}`,
  ];

  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-background px-6 py-[18px] lg:px-6">
      <div className="mb-[18px] flex items-center gap-2.5 rounded-xl border border-spotlight bg-highlight px-4 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-spotlight">
          <IconBulb className="size-[15px] text-on-spotlight" stroke={1.75} />
        </div>
        <p className="text-[11.5px] leading-[1.5] text-foreground">
          여기는 <span className="font-medium">내 프로젝트</span>
          공간이에요. 마감 임박 자리부터 짚어드릴게요. 막히시면 우측 위{" "}
          <span className="font-medium">Kevin 부르기</span> 누르세요.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="m-0 mb-1 text-[22px] font-bold leading-snug tracking-[-0.3px] text-foreground">
            {userName}님의 프로젝트
          </h2>
          <p className="text-[11.5px] text-muted">
            {summaryParts.join(" · ")} · 마감 임박 자리 노랑 강조
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-border-warm bg-panel px-3 py-1.5 text-[11px] text-foreground"
          >
            <IconFilter className="size-3" stroke={1.75} />
            필터
          </button>
          <Link
            href="/project/new"
            className="flex items-center gap-1 rounded-md bg-hub-cta-bg px-3.5 py-1.5 text-[11px] font-medium text-hub-cta-fg"
          >
            <IconPlus className="size-3 text-hub-cta-icon" stroke={2} />
            새 프로젝트
          </Link>
        </div>
      </div>

      {active.length > 0 ? (
        <section className="mb-[18px]">
          <SectionHeader
            dotClass="bg-spotlight"
            labelClass="text-gold"
            title={`진행 중 · ${active.length}`}
          />
          <div className="flex flex-col gap-3">
            {active.map((project) => (
              <ActiveProjectCard
                key={project.id}
                project={project}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </section>
      ) : null}

      {paused.length > 0 ? (
        <section className="mb-[18px]">
          <SectionHeader
            dotClass="bg-muted"
            labelClass="text-muted"
            title={`보류 · ${paused.length}`}
          />
          <div className="flex flex-col gap-2.5">
            {paused.map((project) => (
              <PausedProjectCard
                key={project.id}
                project={project}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <SectionHeader
            dotClass="bg-charcoal"
            labelClass="text-muted"
            title={`완료 · ${completed.length}`}
          />
          <div className="flex flex-col gap-2.5">
            {completed.map((project) => (
              <CompletedProjectCard
                key={project.id}
                project={project}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        </section>
      ) : null}

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-warm bg-panel px-6 py-10 text-center">
          <p className="mb-3 text-sm text-muted">아직 프로젝트가 없어요.</p>
          <Link
            href="/project/new"
            className="inline-flex items-center gap-1 rounded-md bg-spotlight px-4 py-2 text-sm font-medium text-on-spotlight"
          >
            새 프로젝트 시작
            <IconArrowRight className="size-4" stroke={2} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
