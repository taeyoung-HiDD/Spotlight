import {
  IconBook,
  IconBulb,
  IconCheck,
  IconLayoutGrid,
  IconStar,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

interface Persona {
  icon: ReactNode;
  tag: string;
  name: string;
  asis: string;
  tobe: string;
  feature: string;
}

const PERSONAS: Persona[] = [
  {
    icon: <IconStar className="size-[18px]" stroke={1.5} />,
    tag: "첫 창업 · 학생 팀",
    name: "초기 창업가",
    asis: "아이디어는 있는데 어디서부터 시작해야 할지 막막함. 리서치는 한 번도 안 해봄.",
    tobe: "한 사이클 돌고 나면 검증된 컨셉 + 4컷 프로토타입이 손에 남음.",
    feature: "디자인씽킹 5원칙을 분기·잘못된 패턴에서 옆에서 짚어드려요.",
  },
  {
    icon: <IconLayoutGrid className="size-[18px]" stroke={1.5} />,
    tag: "신사업 · 사내 인큐베이션",
    name: "기획자 · PM",
    asis: "리서치·분석·디자인이 따로 진행되어 살아 있는 산출물이 한 자리에 모이지 않음.",
    tobe: "대화하면서 카드가 채워지고, 단계가 바뀌어도 이전 산출물이 출처로 연결됨.",
    feature: "워크북 8단계 + 사업타당성·로드맵 4단계까지 동일 보드에서.",
  },
  {
    icon: <IconBook className="size-[18px]" stroke={1.5} />,
    tag: "실무자 · 워크북 학습자",
    name: "디자인씽킹 실무자",
    asis: "워크북은 읽었지만 실전에서 어떻게 굴리는지 — 분기·체크리스트가 모호함.",
    tobe: "FGD, Travel Along, Bull's Eye 등 메서드를 내 맥락에 맞게 적용 가능.",
    feature: "HiDD Workbook 정본 인용 · 자체 발명 메서드 없음.",
  },
];

const TIPS = [
  {
    num: "01",
    title: "거칠어도 보내세요",
    body: '솔루션 형태가 아니어도 좋아요. "~한 문제를 본 적이 있어요"도 시작점이에요.',
  },
  {
    num: "02",
    title: "코치 제안은 제안이에요",
    body: "노랑으로 도착한 카드는 채택 / 다듬기 / 거절이 모두 가능. 답을 강요하지 않아요.",
  },
  {
    num: "03",
    title: "단계 사이를 자유롭게",
    body: "앞 단계로 돌아가 인용구를 다시 보는 게 자연스러운 작업이에요. 직선이 아니에요.",
  },
  {
    num: "04",
    title: "AI 페르소나는 가설",
    body: "실제 사람을 만나기 전 리허설에 쓰세요. 발견은 응답자 인터뷰 후에 게이트가 열려요.",
  },
] as const;

const PRINCIPLES = [
  ["팀 활동", "혼자 결정하지 않기"],
  ["인내심", "한 번에 풀지 않기"],
  ["Ideate 전 솔루션 금지", "관찰부터"],
  ["가설 아닌 Insight", "근거에서"],
  ["디지털 자제", "화면 밖 행동"],
] as const;

function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <article className="flex flex-col gap-[11px] rounded-[14px] border border-border-warm bg-panel p-[18px] pb-4">
      <div className="flex size-9 items-center justify-center rounded-[10px] border border-border-warm bg-surface text-foreground">
        {persona.icon}
      </div>

      <div>
        <p className="mb-1.5 text-[10.5px] font-bold tracking-[1.4px] text-muted uppercase">
          {persona.tag}
        </p>
        <h3 className="text-xl font-bold tracking-[-0.3px] text-charcoal leading-[1.2]">
          {persona.name}
        </h3>
      </div>

      <div className="mt-1 flex flex-col gap-2">
        <div>
          <span className="mb-1 inline-block rounded bg-cream px-[7px] py-0.5 font-mono text-[9.5px] tracking-wide text-muted">
            AS-IS
          </span>
          <p className="text-[11.5px] leading-[1.55] text-foreground/90">{persona.asis}</p>
        </div>
        <div>
          <span className="mb-1 inline-block rounded bg-charcoal px-[7px] py-0.5 font-mono text-[9.5px] tracking-wide text-spotlight">
            TO-BE
          </span>
          <p className="text-[11.5px] leading-[1.55] text-foreground/90">{persona.tobe}</p>
        </div>
      </div>

      <div className="mt-1 flex items-start gap-[7px] border-t border-divider pt-[11px]">
        <span className="mt-0.5 flex size-[13px] shrink-0 items-center justify-center rounded-full bg-spotlight">
          <IconCheck className="size-2.5 text-on-spotlight" stroke={2.5} />
        </span>
        <p className="text-[11px] leading-normal text-foreground/85">{persona.feature}</p>
      </div>
    </article>
  );
}

export function LandingEntrySections() {
  return (
    <div className="bg-background">
      {/* For whom */}
      <section className="px-8 py-14">
        <div className="mx-auto max-w-[1100px]">
          <header className="mb-6 flex flex-col items-center gap-2.5 text-center">
            <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
              For whom
            </p>
            <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
              어떤 분께 권해요?
            </h2>
            <p className="max-w-[560px] text-[15px] leading-[1.65] text-muted">
              Kevin은 <em className="italic">답을 먼저 주지 않아요</em>. 옆에서 한
              턴에 한 가지씩, 잘못 가는 결을 짚어주는 역할이에요.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {PERSONAS.map((persona) => (
              <PersonaCard key={persona.name} persona={persona} />
            ))}
          </div>
        </div>
      </section>

      {/* Tips + Principles */}
      <section className="px-8 pb-14">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5">
          <div className="rounded-[14px] border border-border-warm bg-panel px-7 py-7">
            <div className="mb-[18px] flex items-center gap-2.5">
              <IconBulb className="size-[18px] text-gold" stroke={1.6} />
              <h2 className="text-lg font-bold tracking-[-0.2px] text-charcoal">
                시작하기 전에 — 잘 쓰는 팁
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TIPS.map((tip) => (
                <div key={tip.num} className="flex items-start gap-3.5">
                  <span className="mt-0.5 shrink-0 font-mono text-[13px] font-bold tracking-wide text-gold">
                    {tip.num}
                  </span>
                  <div>
                    <h3 className="mb-1 text-[15px] font-bold tracking-[-0.1px] text-foreground">
                      {tip.title}
                    </h3>
                    <p className="text-[13px] leading-[1.6] text-foreground/75">
                      {tip.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-border-warm bg-panel px-6 py-5">
            <p className="mb-3.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
              먼저 알려드릴 디자인씽킹 5원칙
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {PRINCIPLES.map(([title, sub]) => (
                <div
                  key={title}
                  className="rounded-lg bg-surface px-3.5 py-3"
                >
                  <p className="mb-1 text-sm font-bold leading-snug tracking-[-0.1px] text-foreground">
                    {title}
                  </p>
                  <p className="text-xs leading-normal text-foreground/75">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] italic text-muted">
            회백색 무드의 차분함 안에서, 통찰이 일어나는 한 자리에 노랑이 켜진다.
          </p>
        </div>
      </section>
    </div>
  );
}
