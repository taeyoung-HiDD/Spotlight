import { IconFlame } from "@tabler/icons-react";

type ProgramFilter = "all" | "gov" | "local" | "vc";

interface Program {
  name: string;
  org: string;
  orgLabel: string;
  description: string;
  amount: string;
  amountNote: string;
  deadline: string;
  deadlineVariant: "urgent" | "normal";
  featured?: boolean;
}

const FILTERS: { id: ProgramFilter; label: string; active?: boolean }[] = [
  { id: "all", label: "전체 · 27", active: true },
  { id: "gov", label: "정부" },
  { id: "local", label: "지자체" },
  { id: "vc", label: "VC" },
];

const PROGRAMS: Program[] = [
  {
    name: "초기창업패키지",
    org: "정부 · 중기부",
    orgLabel: "bg-yellow-tint text-gold font-medium",
    description: "시제품 단계 창업 3년 미만",
    amount: "1억",
    amountNote: "+ 멘토링",
    deadline: "D-12",
    deadlineVariant: "urgent",
    featured: true,
  },
  {
    name: "경기 콘텐츠진흥원",
    org: "지자체 · 경기",
    orgLabel: "bg-cream text-muted",
    description: "콘텐츠·플랫폼 트랙",
    amount: "5천",
    amountNote: "+ 입주",
    deadline: "D-15",
    deadlineVariant: "normal",
  },
  {
    name: "스파크랩 17기",
    org: "민간 · 액셀",
    orgLabel: "bg-cream text-muted",
    description: "3개월 + 데모데이",
    amount: "5천",
    amountNote: "+ 프로그램",
    deadline: "D-23",
    deadlineVariant: "normal",
  },
  {
    name: "소상공인 디지털 전환",
    org: "정부 · 소진공",
    orgLabel: "bg-yellow-tint text-gold font-medium",
    description: "소상공인 대상 솔루션",
    amount: "5천",
    amountNote: "+ 시범 매장",
    deadline: "D-31",
    deadlineVariant: "normal",
  },
];

function ProgramCard({ program }: { program: Program }) {
  const urgentDeadline = program.deadlineVariant === "urgent";

  return (
    <article
      className={[
        "relative rounded-[11px] bg-white p-[13px]",
        program.featured
          ? "border-[1.5px] border-spotlight"
          : "border border-border-warm",
      ].join(" ")}
    >
      <span
        className={[
          "absolute -top-[7px] right-[11px] rounded px-1.5 py-px text-[8.5px] font-medium",
          urgentDeadline
            ? "bg-spotlight text-charcoal"
            : "bg-spotlight text-on-spotlight",
        ].join(" ")}
      >
        {program.deadline}
      </span>

      <span
        className={[
          "mb-[7px] inline-block rounded px-1.5 py-px text-[8.5px]",
          program.orgLabel,
        ].join(" ")}
      >
        {program.org}
      </span>

      <h3 className="mb-1 text-xs font-semibold leading-snug text-charcoal">
        {program.name}
      </h3>
      <p className="mb-2 text-[10px] leading-normal text-muted">
        {program.description}
      </p>

      <div className="flex items-baseline gap-[5px]">
        <span className="text-base font-bold text-charcoal">{program.amount}</span>
        <span className="text-[9px] text-muted">{program.amountNote}</span>
      </div>
    </article>
  );
}

export function HomeDeadlinePrograms() {
  return (
    <section
      id="programs"
      className="mb-3.5 rounded-[14px] border border-spotlight bg-highlight p-[22px]"
    >
      <div className="mb-[15px] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-[9px]">
          <IconFlame className="size-[15px] text-gold" stroke={1.75} />
          <div>
            <h2 className="text-[13px] font-medium text-charcoal">
              지금 신청 가능한 프로그램 · 마감 임박
            </h2>
            <p className="mt-0.5 text-[10.5px] text-muted">
              14 단계 끝까지 가지 않으셔도 됩니다
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-[5px]">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={[
                "rounded-[5px] border px-2.5 py-[5px] text-[10px]",
                filter.active
                  ? "border-spotlight bg-white font-medium text-charcoal"
                  : "border-border-warm bg-white text-muted",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {PROGRAMS.map((program) => (
          <ProgramCard key={program.name} program={program} />
        ))}
      </div>
    </section>
  );
}
