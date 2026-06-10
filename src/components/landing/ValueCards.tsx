import { IconFlame, IconSchool, IconSparkles } from "@tabler/icons-react";

const CARDS = [
  {
    featured: false,
    icon: IconSchool,
    iconBg: "bg-charcoal",
    iconColor: "text-spotlight",
    label: "01 · 코치와 함께",
    title: "디자인씽킹 14 단계 워크북 정본",
    description: "HiDD 워크북 정본 + 수준 적응 코칭",
  },
  {
    featured: true,
    icon: IconSparkles,
    iconBg: "bg-spotlight",
    iconColor: "text-on-spotlight",
    label: "02 · AI 시각 생성",
    title: "스토리보드와 시제품, 피치 덱 자동 생성",
    description:
      "컨셉 시트가 일러스트 5컷으로, 실제 화면으로, 12 슬라이드로",
  },
  {
    featured: false,
    icon: IconFlame,
    iconBg: "bg-charcoal",
    iconColor: "text-spotlight",
    label: "03 · 외부 도착점",
    title: "지원사업과 투자 맞춤 매칭",
    description: "정부·지자체·VC 200개 이상 + 신청 자료 자동 매핑",
  },
] as const;

export function ValueCards() {
  return (
    <section className="bg-panel px-8 py-[52px]">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-8 text-center">
          <p className="mb-[11px] text-[10.5px] font-medium tracking-[1.5px] text-gold uppercase">
            왜 Spotlight인가
          </p>
          <h2 className="m-0 text-[28px] font-bold leading-[1.3] tracking-[-0.5px] text-foreground">
            세 가지가 한 자리에서
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className={[
                  "relative rounded-[14px] p-[22px]",
                  card.featured
                    ? "border-[1.5px] border-spotlight bg-highlight"
                    : "bg-cream",
                ].join(" ")}
              >
                {card.featured && (
                  <span className="absolute -top-2.5 right-4 rounded bg-spotlight px-[9px] py-[3px] text-[9px] font-bold tracking-[0.4px] text-on-spotlight">
                    우리 차별
                  </span>
                )}

                <div
                  className={`mb-3.5 flex size-[42px] items-center justify-center rounded-[10px] ${card.iconBg}`}
                >
                  <Icon className={`size-5 ${card.iconColor}`} stroke={2} />
                </div>

                <p className="mb-1.5 text-[9.5px] font-medium tracking-[0.5px] text-gold uppercase">
                  {card.label}
                </p>
                <h3 className="mb-2 text-[15px] font-semibold leading-[1.35] text-foreground">
                  {card.title}
                </h3>
                <p className="text-[11.5px] leading-[1.6] text-foreground/75">
                  {card.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
