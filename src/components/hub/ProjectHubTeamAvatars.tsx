import type { HubTeamMember } from "@/lib/projects/fetchHubProjectTeams";

const MAX_VISIBLE = 5;

const AVATAR_PALETTE = [
  "bg-spotlight/20 text-gold",
  "bg-cream text-foreground",
  "bg-highlight text-foreground",
  "bg-surface text-foreground",
] as const;

function avatarColorClass(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[hash] ?? AVATAR_PALETTE[0];
}

type AvatarSize = "sm" | "md";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "size-7 text-[10px]",
  md: "size-8 text-[11px]",
};

interface ProjectHubTeamAvatarsProps {
  members: HubTeamMember[];
  size?: AvatarSize;
  className?: string;
}

/** 노션·피그마 스타일 — 겹친 참여자 아바타 스택 */
export function ProjectHubTeamAvatars({
  members,
  size = "md",
  className = "",
}: ProjectHubTeamAvatarsProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;
  const sizeClass = SIZE_CLASS[size];
  const names = members.map((m) => m.displayName).join(", ");

  return (
    <ul
      className={["m-0 flex list-none items-center p-0", className].join(" ")}
      aria-label={`참여 중인 팀원 ${members.length}명: ${names}`}
    >
      {visible.map((member, index) => (
        <li
          key={member.userId}
          className={[
            "group relative",
            index > 0 ? (size === "sm" ? "-ml-2" : "-ml-2.5") : "",
          ].join(" ")}
          style={{ zIndex: visible.length - index }}
        >
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt=""
              className={[
                sizeClass,
                "rounded-full border-2 border-panel object-cover shadow-[0_0_0_1px_rgba(45,45,42,0.06)]",
              ].join(" ")}
            />
          ) : (
            <span
              className={[
                "inline-flex items-center justify-center rounded-full border-2 border-panel font-semibold shadow-[0_0_0_1px_rgba(45,45,42,0.06)]",
                sizeClass,
                avatarColorClass(member.userId),
              ].join(" ")}
              aria-hidden
            >
              {member.initial}
            </span>
          )}
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-warm bg-tooltip-bg px-2 py-1 text-[10px] font-medium text-tooltip-fg opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {member.displayName}
          </span>
        </li>
      ))}
      {overflow > 0 ? (
        <li
          className={size === "sm" ? "-ml-2" : "-ml-2.5"}
          style={{ zIndex: 0 }}
          title={`외 ${overflow}명`}
        >
          <span
            className={[
              "inline-flex items-center justify-center rounded-full border-2 border-panel bg-cream font-semibold text-muted shadow-[0_0_0_1px_rgba(45,45,42,0.06)]",
              sizeClass,
            ].join(" ")}
          >
            +{overflow}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
