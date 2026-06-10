import {
  IconArrowRight,
  IconBulb,
  IconRoute,
  IconRocket,
  IconSeedling,
} from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface EntryCard {
  id: "A" | "B" | "C";
  icon: ReactNode;
  tag: string;
  tagClass: string;
  title: string;
  description: string;
  footer: string;
  featured?: boolean;
}

const ENTRY_CARDS: EntryCard[] = [
  {
    id: "A",
    icon: <IconSeedling className="size-[17px] text-gold" stroke={1.5} />,
    tag: "A · 가장 많이",
    tagClass: "bg-white text-gold font-medium",
    title: "처음부터 차근차근",
    description: "아이디어 출발점부터 디자인씽킹 14 단계 전체",
    footer: "14 단계 · 코치와 함께",
    featured: true,
  },
  {
    id: "B",
    icon: <IconBulb className="size-[17px] text-muted" stroke={1.5} />,
    tag: "B",
    tagClass: "bg-cream text-muted",
    title: "아이디어 가진 채로",
    description: "아이디어가 이미 있고 사용자 검증부터 시작",
    footer: "단계 2부터",
  },
  {
    id: "C",
    icon: <IconRocket className="size-[17px] text-muted" stroke={1.5} />,
    tag: "C",
    tagClass: "bg-cream text-muted",
    title: "프로토타입 빨리",
    description: "컨셉이 정해진 상태 · 시제품·피치 덱까지",
    footer: "단계 8부터",
  },
];

function EntryPointCardBody({ card }: { card: EntryCard }) {
  return (
    <>
      <div className="mb-2 flex items-center gap-1.5">
        {card.icon}
        <span
          className={[
            "rounded px-1.5 py-px text-[9.5px] tracking-[0.3px]",
            card.tagClass,
          ].join(" ")}
        >
          {card.tag}
        </span>
      </div>
      <h3 className="mb-1 text-[13px] font-semibold leading-snug text-charcoal">
        {card.title}
      </h3>
      <p className="text-[10.5px] leading-[1.55] text-muted">{card.description}</p>
      <div
        className={[
          "mt-2 flex items-center gap-1 border-t pt-2",
          card.featured ? "border-yellow-tint" : "border-divider",
        ].join(" ")}
      >
        <span
          className={[
            "text-[9px] font-medium",
            card.featured ? "text-gold" : "text-muted",
          ].join(" ")}
        >
          {card.footer}
        </span>
        <IconArrowRight
          className={[
            "ml-auto size-[11px]",
            card.featured ? "text-gold" : "text-muted",
          ].join(" ")}
          stroke={2}
        />
      </div>
    </>
  );
}

function EntryPointCard({ card }: { card: EntryCard }) {
  const className = [
    "block w-full rounded-[10px] p-[15px] text-left transition-shadow hover:shadow-sm",
    card.featured
      ? "border-[1.5px] border-spotlight bg-highlight"
      : "border border-border-warm bg-white",
  ].join(" ");

  return (
    <Link href="/project/new" className={className}>
      <EntryPointCardBody card={card} />
    </Link>
  );
}

export function HomeNewProject() {
  return (
    <section className="mb-3.5 rounded-[14px] border border-border-warm bg-white p-[22px]">
      <div className="mb-[15px] flex items-center gap-[9px]">
        <IconRoute className="size-[15px] text-charcoal" stroke={1.75} />
        <div>
          <h2 className="text-[13px] font-medium text-charcoal">
            새 프로젝트 시작 · 어디서 출발하세요?
          </h2>
          <p className="mt-0.5 text-[10.5px] text-muted">
            새 아이디어를 코치와 함께 정리하는 자리
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {ENTRY_CARDS.map((card) => (
          <EntryPointCard key={card.id} card={card} />
        ))}
      </div>

      <p className="mt-3.5 text-center text-[10px] text-muted">
        진입 후 짧은 설문으로 코치 맞춤을 정하고 단계 흐름에 들어갑니다.
      </p>
    </section>
  );
}
