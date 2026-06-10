import { LandingCta } from "@/components/landing/LandingCta";
import { LandingEntrySections } from "@/components/landing/LandingEntrySections";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { ValueCards } from "@/components/landing/ValueCards";

export default function Home() {
  return (
    <div
      data-mood="marketing"
      className="min-h-full bg-background text-foreground"
    >
      <h2 className="sr-only">컷 34 v2 마케팅 랜딩 페이지 로그인 전.</h2>
      <main className="overflow-hidden">
        <LandingHeader />
        <LandingHero />
        <ValueCards />
        <LandingEntrySections />
        <LandingCta />
      </main>
    </div>
  );
}
