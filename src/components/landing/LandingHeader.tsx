"use client";

import Link from "next/link";
import { HiDDCoachBrand } from "@/components/brand/HiDDCoachBrand";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { StartProjectLink } from "@/components/project/StartProjectLink";
import { useT } from "@/hooks/useT";
import { brandSans } from "@/lib/fonts/brand";

const NAV_ITEMS = [
  { key: "landing.nav.about", hash: "소개" },
  { key: "landing.nav.work", hash: "우리가 하는 일" },
  { key: "landing.nav.cases", hash: "사례" },
  { key: "landing.nav.pricing", hash: "요금" },
  { key: "landing.nav.contact", hash: "문의" },
] as const;

export function LandingHeader() {
  const t = useT();

  return (
    <header className="flex items-center gap-[18px] bg-zone-cell-bg px-7 py-3.5">
      <HiDDCoachBrand variant="dark" href="/" />

      <nav
        className={`${brandSans.className} ml-5 flex items-center gap-[22px]`}
        aria-label={t("landing.navAria")}
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href={`#${item.hash}`}
            className="text-[15px] font-semibold text-white/90 transition-colors hover:text-white"
          >
            {t(item.key)}
          </a>
        ))}
      </nav>

      <div className="flex-1" aria-hidden />

      <div className={`${brandSans.className} flex items-center gap-2.5`}>
        <LocaleToggle variant="onDark" />
        <Link
          href="/login"
          className="px-[13px] py-1.5 text-[15px] font-semibold text-white/90 transition-colors hover:text-white"
        >
          {t("landing.login")}
        </Link>
        <StartProjectLink
          href="/project/new"
          className="rounded-[5px] bg-spotlight px-3.5 py-1.5 text-[15px] font-bold tracking-[0.02em] text-on-spotlight transition-opacity hover:opacity-95"
        >
          {t("landing.start")}
        </StartProjectLink>
      </div>
    </header>
  );
}
