import { Barlow_Semi_Condensed, Sacramento } from "next/font/google";

/** DTA 상단 메뉴 유사 — Helvetica Neue LT Std 콘덴스드 대체 */
export const brandSans = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand-sans",
  display: "swap",
});

/**
 * DTA 로고(dta.logo.svg) 유사 필기체 워드마크
 * @see https://www.designthinkersacademy.com/
 */
export const brandScript = Sacramento({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-brand-script",
  display: "swap",
});
