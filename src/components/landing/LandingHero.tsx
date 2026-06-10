import { IconSparkles } from "@tabler/icons-react";
import { StartProjectLink } from "@/components/project/StartProjectLink";
import { CoachingDemoAnimation } from "@/components/landing/CoachingDemoAnimation";

const AVATARS: {
  label: string;
  bg: string;
  text: string;
  textSize?: string;
}[] = [
  { label: "민", bg: "bg-spotlight", text: "text-on-spotlight" },
  { label: "지", bg: "bg-muted", text: "text-white" },
  { label: "현", bg: "bg-charcoal", text: "text-spotlight" },
  { label: "+12", bg: "bg-avatar-muted", text: "text-white", textSize: "text-[9px]" },
];

export function LandingHero() {
  return (
    <section className="bg-background px-8 py-14">
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div>
          <div className="mb-[18px] inline-flex items-center gap-1.5 rounded-[18px] border border-spotlight bg-highlight px-[11px] py-[5px]">
            <IconSparkles className="size-3 text-gold" stroke={2} />
            <span className="text-[10.5px] font-medium tracking-[0.3px] text-gold">
              HiDD Human Centered Innovation Approach 기반
            </span>
          </div>

          <h1 className="mb-[18px] text-[40px] font-bold leading-[1.18] tracking-[-1px] text-charcoal">
            아이디어에서
            <br />
            투자자 만남까지
            <br />
            <span className="text-gold">한 자리에서 코치와 함께</span>
          </h1>

          <p className="mb-[26px] text-sm leading-[1.65] text-muted">
            예비 창업자가 디자인씽킹 14 단계를 따라가며 시제품과 피치 덱을
            만들고 지원사업과 투자에 도달하는 코칭 도구를 AI코치와 함께
            사용해보세요.
          </p>

          <div className="mb-6 flex flex-wrap gap-3">
            <StartProjectLink
              href="/project/new"
              className="inline-block rounded-[7px] bg-spotlight px-[22px] py-[13px] text-[13px] font-medium text-on-spotlight transition-opacity hover:opacity-95"
            >
              무료로 시작하기 →
            </StartProjectLink>
            <button
              type="button"
              className="rounded-[7px] border border-border-warm bg-panel px-[22px] py-[13px] text-[13px] font-medium text-foreground transition-colors hover:bg-surface"
            >
              서비스 데모 보기
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex">
              {AVATARS.map((avatar, index) => (
                <div
                  key={avatar.label}
                  className={[
                    "flex size-[26px] items-center justify-center rounded-full border-2 border-cream text-[10px] font-semibold",
                    avatar.bg,
                    avatar.text,
                    avatar.textSize ?? "",
                    index > 0 ? "-ml-2" : "",
                  ].join(" ")}
                >
                  {avatar.label}
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-[1.55] text-muted">
              현재{" "}
              <span className="font-medium text-foreground">
                15팀의 예비 창업자
              </span>
              가
              <br />
              코치와 함께 작업 중
            </p>
          </div>
        </div>

        <div>
          <CoachingDemoAnimation />
        </div>
      </div>
    </section>
  );
}
