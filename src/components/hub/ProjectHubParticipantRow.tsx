import type { HubTeamMember } from "@/lib/projects/fetchHubProjectTeams";
import { ProjectHubTeamAvatars } from "@/components/hub/ProjectHubTeamAvatars";

interface ProjectHubParticipantRowProps {
  members: HubTeamMember[];
  align?: "start" | "end";
  compact?: boolean;
}

/** 프로젝트 카드 · 참여자 아바타 + 인원 라벨 */
export function ProjectHubParticipantRow({
  members,
  align = "end",
  compact = false,
}: ProjectHubParticipantRowProps) {
  if (members.length === 0) return null;

  const label =
    members.length === 1
      ? `${members[0].displayName} 참여 중`
      : `${members.length}명 참여 중`;

  return (
    <div
      className={[
        "flex items-center gap-2",
        align === "end" ? "justify-end" : "justify-start",
        compact ? "mb-0" : "mb-1",
      ].join(" ")}
    >
      <ProjectHubTeamAvatars
        members={members}
        size={compact ? "sm" : "md"}
      />
      <span className="text-[10px] text-muted break-keep">{label}</span>
    </div>
  );
}
