export interface PrototypeHtmlInput {
  conceptName: string;
  conceptDescription?: string;
  features?: string[];
  storyboardCuts?: string[];
  platform: "mobile" | "web";
  latentNeed?: string;
}

export function buildPrototypeHtmlPrompt(input: PrototypeHtmlInput): string {
  const features =
    input.features?.filter((f) => f.trim()).slice(0, 6) ?? [];
  const cuts =
    input.storyboardCuts?.filter((c) => c.trim()).slice(0, 5) ?? [];
  const featureBlock =
    features.length > 0
      ? features.map((f, i) => `${i + 1}. ${f.trim()}`).join("\n")
      : "(기능 미입력)";
  const cutBlock =
    cuts.length > 0
      ? cuts.map((c, i) => `컷 ${i + 1}: ${c.trim()}`).join("\n")
      : "(스토리보드 미입력)";

  const frameHint =
    input.platform === "mobile"
      ? "모바일 앱 화면 4~6개를 세로 스크롤 카드로 배치 (각 화면 max-width 390px)"
      : "웹 앱 화면 4~6개를 가로 그리드 또는 세로 스크롤로 배치";

  return `
당신은 DT Coach 시제품 HTML 생성기입니다.
실제 서비스처럼 보이는 **정적 UI 목업** HTML 한 파일을 만듭니다.

컨셉: ${input.conceptName.trim().slice(0, 120)}
설명: ${(input.conceptDescription ?? "").trim().slice(0, 400) || "(미입력)"}
플랫폼: ${input.platform === "mobile" ? "Mobile" : "Web"}
잠재 니즈(마지막 화면 카피 참고): ${(input.latentNeed ?? "").trim().slice(0, 300) || "(미입력)"}

핵심 기능:
${featureBlock}

스토리보드 흐름 (화면 순서와 1:1 매핑):
${cutBlock}

규칙:
- 완전한 HTML 문서 (<!DOCTYPE html> ~ </html>)
- Tailwind CDN만 사용: <script src="https://cdn.tailwindcss.com"></script>
- 외부 JS·fetch·API 호출 금지
- 차콜(#2D2D2A)·흰 배경·노랑 강조(#F4C430) — 무드 가이드 v3
- ${frameHint}
- 마지막 화면이 체험 도착점(니즈 해소)으로 보이게
- 설명·마크다운 없이 HTML만 출력
`.trim();
}
