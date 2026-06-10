import Link from "next/link";
import { HiDDCoachBrand } from "@/components/brand/HiDDCoachBrand";
import { StartProjectLink } from "@/components/project/StartProjectLink";
import { brandSans } from "@/lib/fonts/brand";

const NAV_ITEMS = ["소개", "우리가 하는 일", "사례", "요금", "문의"] as const;

export function LandingHeader() {
  return (
    <header className="flex items-center gap-[18px] bg-zone-cell-bg px-7 py-3.5">
      <HiDDCoachBrand variant="dark" href="/" />

      <nav
        className={`${brandSans.className} ml-5 flex items-center gap-[22px]`}
        aria-label="주요 메뉴"
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item}
            href={`#${item}`}
            className="text-[15px] font-semibold text-white/90 transition-colors hover:text-white"
          >
            {item}
          </a>
        ))}
      </nav>

      <div className="flex-1" aria-hidden />

      <div className={`${brandSans.className} flex items-center gap-2.5`}>
        <Link
          href="/login"
          className="px-[13px] py-1.5 text-[15px] font-semibold text-white/90 transition-colors hover:text-white"
        >
          로그인
        </Link>
        <StartProjectLink
          href="/project/new"
          className="rounded-[5px] bg-spotlight px-3.5 py-1.5 text-[15px] font-bold tracking-[0.02em] text-on-spotlight transition-opacity hover:opacity-95"
        >
          시작하기 →
        </StartProjectLink>
      </div>
    </header>
  );
}
