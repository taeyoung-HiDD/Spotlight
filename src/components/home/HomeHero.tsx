interface HomeHeroProps {
  userName?: string;
  summary?: string;
}

export function HomeHero({
  userName = "민호",
  summary = "2 프로젝트 진행 중 · 안심 매대에서 30일 마일스톤 도래 · 마감 임박 프로그램 3개",
}: HomeHeroProps) {
  return (
    <section className="mb-6">
      <p className="mb-2.5 text-[10.5px] font-medium tracking-wide text-muted uppercase">
        DESIGN THINKING COACH · 홈
      </p>
      <h1 className="mb-2 text-[26px] font-bold leading-[1.25] tracking-[-0.5px] text-charcoal">
        {userName}님, 다시 오셨네요
      </h1>
      <p className="text-[12.5px] leading-[1.65] text-muted">{summary}</p>
    </section>
  );
}
