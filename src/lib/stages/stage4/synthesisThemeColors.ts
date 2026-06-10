export interface SynthesisThemeColor {
  chipClass: string;
  ringClass: string;
}

/** 테마 추가 순서별 구분 색 (작업 무드 · 파스텔 톤) */
export const SYNTHESIS_THEME_COLORS: SynthesisThemeColor[] = [
  {
    chipClass: "bg-[#e8f5e9]/90 border-[#81c784]/65 text-[#2e7d32]",
    ringClass: "ring-[#66bb6a]/55",
  },
  {
    chipClass: "bg-[#f3e5f5]/90 border-[#ce93d8]/65 text-[#6a1b9a]",
    ringClass: "ring-[#ab47bc]/50",
  },
  {
    chipClass: "bg-[#e3f2fd]/90 border-[#90caf9]/65 text-[#1565c0]",
    ringClass: "ring-[#42a5f5]/50",
  },
  {
    chipClass: "bg-[#fff8e1]/90 border-[#ffe082]/70 text-[#f57f17]",
    ringClass: "ring-[#ffca28]/55",
  },
  {
    chipClass: "bg-[#fce4ec]/90 border-[#f48fb1]/65 text-[#c2185b]",
    ringClass: "ring-[#ec407a]/50",
  },
  {
    chipClass: "bg-[#e0f2f1]/90 border-[#80cbc4]/65 text-[#00695c]",
    ringClass: "ring-[#26a69a]/50",
  },
  {
    chipClass: "bg-[#ede7f6]/90 border-[#b39ddb]/65 text-[#4527a0]",
    ringClass: "ring-[#7e57c2]/50",
  },
  {
    chipClass: "bg-[#fbe9e7]/90 border-[#ffab91]/65 text-[#d84315]",
    ringClass: "ring-[#ff7043]/50",
  },
];

export function themeColorIndex(theme: string, themes: string[]): number {
  const idx = themes.indexOf(theme);
  return idx >= 0 ? idx : 0;
}

export function themeColorForName(
  theme: string,
  themes: string[],
): SynthesisThemeColor {
  return SYNTHESIS_THEME_COLORS[
    themeColorIndex(theme, themes) % SYNTHESIS_THEME_COLORS.length
  ];
}
