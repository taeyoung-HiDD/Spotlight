import type { HubTeamMember } from "@/lib/projects/fetchHubProjectTeams";

const MAX_VISIBLE = 5;

interface ProjectHubTeamAvatarsProps {
  members: HubTeamMember[];
  className?: string;
}

/** 프로젝트 제목 옆 — 팀원 썸네일 또는 이니셜 스택 */
export function ProjectHubTeamAvatars({
  members,
  className = "",
}: ProjectHubTeamAvatarsProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;

  return (
    <ul
      className={["m-0 flex list-none items-center p-0", className].join(" ")}
      aria-label={`함께 작업 중인 팀원 ${members.length}명`}
    >
      {visible.map((member, index) => (
        <li
          key={member.userId}
          className={index > 0 ? "-ml-1.5" : ""}
          title={member.displayName}
        >
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt=""
              className="size-7 rounded-full border-2 border-panel object-cover"
            />
          ) : (
            <span
              className="inline-flex size-7 items-center justify-center rounded-full border-2 border-panel bg-surface text-[10px] font-semibold text-foreground"
              aria-hidden
            >
              {member.initial}
            </span>
          )}
        </li>
      ))}
      {overflow > 0 ? (
        <li className="-ml-1.5" title={`외 ${overflow}명`}>
          <span className="inline-flex size-7 items-center justify-center rounded-full border-2 border-panel bg-cream text-[9px] font-semibold text-muted">
            +{overflow}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
