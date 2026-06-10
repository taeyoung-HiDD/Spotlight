import Link from "next/link";
import { StartProjectLink } from "@/components/project/StartProjectLink";

export function LandingCta() {
  return (
    <section className="bg-background px-8 py-[52px]">
      <div className="mx-auto max-w-[700px] text-center">
        <p className="mb-[13px] text-[10.5px] font-medium tracking-[1.5px] text-gold uppercase">
          시작하세요
        </p>
        <h2 className="m-0 mb-3.5 text-[28px] font-bold leading-[1.3] tracking-[-0.6px] text-foreground">
          아이디어 한 줄에서 시작합니다
        </h2>
        <p className="mb-[22px] text-[13px] leading-[1.65] text-muted">
          진입 후 짧은 설문으로 코치 맞춤을 정하고, 14 단계 흐름에
          들어갑니다.
          단계 8 컨셉 시트 완성 시점부터 지원사업 매칭이 시작됩니다.
        </p>
        <div className="mb-4 flex flex-wrap justify-center gap-3">
          <StartProjectLink
            href="/project/new"
            className="inline-block rounded-lg bg-spotlight px-[26px] py-3.5 text-sm font-medium text-on-spotlight transition-opacity hover:opacity-95"
          >
            무료로 시작하기 →
          </StartProjectLink>
          <Link
            href="/login"
            className="rounded-lg border border-border-warm bg-panel px-[22px] py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            로그인
          </Link>
        </div>
        <p className="text-[10.5px] text-muted">
          신용카드 등록 불필요 · 첫 프로젝트 무료 · 30초 안에 시작
        </p>
      </div>
    </section>
  );
}
