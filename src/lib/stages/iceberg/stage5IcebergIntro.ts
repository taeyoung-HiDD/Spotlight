import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import {
  extractSaysFromEmpathyMaps,
  type Stage5BaselineContext,
} from "@/lib/stages/iceberg/stage5ProjectContext";
import type { Stage4PersonaEmpathyMap } from "@/lib/stages/stage4/types";

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function personaLabels(maps: Stage4PersonaEmpathyMap[]): string {
  return maps
    .map((m, idx) => m.personaName.trim() || `페르소나 ${idx + 1}`)
    .join(", ");
}

/** 5단계 인트로 — 1단계 문제점·4단계 공감맵 기반 (고정 데모 문구 없음) */
export function buildStage5IntroCoachMessages(
  baseline: Stage5BaselineContext,
): CoachDialogItem[] {
  const problem = baseline.startingPoint.trim();
  const saysQuotes = extractSaysFromEmpathyMaps(baseline.empathyMaps);
  const primarySays = saysQuotes[0];
  const personaCount = baseline.empathyMaps.filter(
    (m) =>
      m.personaName.trim() ||
      m.personaContext.trim() ||
      m.quadrants.says.some((i) => i.text.trim()) ||
      m.quadrants.thinks.some((i) => i.text.trim()) ||
      m.quadrants.does.some((i) => i.text.trim()) ||
      m.quadrants.feels.some((i) => i.text.trim()),
  ).length;

  const messages: CoachDialogItem[] = [];

  if (problem) {
    messages.push({
      type: "highlight",
      label: "1단계 문제점",
      content: formatCoachDialogBreaks(problem),
    });
  }

  if (primarySays) {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        `4단계 공감맵 · ${primarySays.personaLabel}님의 말함(Says)에 「${clip(primarySays.text, 72)}」이(가) 있어요. 1층 말한 것(Explicit) 후보로 보면 돼요. 말로 표현한 자리만 보면 가끔 더 깊은 결을 놓칠 때가 있어요.`,
      ),
    });
  } else if (problem) {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        `1단계 문제 「${clip(problem, 72)}」을(를) 출발점으로, 고객이 말로 표현한 니즈(말한 것)부터 위쪽 층을 채워 볼게요.`,
      ),
    });
  } else {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        "고객이 말로 표현한 니즈(말한 것)부터 위쪽 층을 채워 볼게요. 표면에 드러난 말만으로는 깊은 동기를 놓치기 쉬워요.",
      ),
    });
  }

  if (personaCount > 0) {
    messages.push({
      type: "bubble",
      variant: "secondary",
      content: formatCoachDialogBreaks(
        `4단계에서 정리한 페르소나 ${personaCount}명(${personaLabels(baseline.empathyMaps)})의 공감맵을 바탕으로, 말한 것·행동·잠재 동기를 세 층으로 나눠 볼게요.`,
      ),
    });
  } else if (!problem) {
    messages.push({
      type: "bubble",
      variant: "secondary",
      content:
        "1·4단계 자료가 아직 비어 있으면, 아래 대화로 말한 것부터 같이 채워 갈 수 있어요.",
    });
  }

  messages.push(
    {
      type: "highlight",
      label: "디자인씽킹 정신",
      content: "How보다 Why — 표면 답이 아니라 깊은 동기로 내려간다.",
    },
    {
      type: "bubble",
      content: formatCoachDialogBreaks(
        "세 층으로 같이 정리해 봐요. 표면(말한 것)부터 시작해서 행동에서 본 것, 그리고 우리가 분석으로 찾아낸 것까지요.",
      ),
    },
    {
      type: "bubble",
      variant: "secondary",
      content: formatCoachDialogBreaks(
        "Latent 자리는 가설이에요. 단계 10에서 사용자와 함께 검증하면서 맞는 자리인지 같이 확인해 볼 거예요.",
      ),
    },
  );

  return messages;
}

/** 코치 입력 예시 — 4단계 Says·1단계 문제에서 도출 */
export function buildStage5DiscoveryInputExamples(
  baseline: Stage5BaselineContext,
): string[] {
  const says = extractSaysFromEmpathyMaps(baseline.empathyMaps)
    .map((q) => q.text)
    .slice(0, 2);
  const does = baseline.empathyMaps
    .flatMap((m) => m.quadrants.does.map((i) => i.text.trim()))
    .filter(Boolean)
    .slice(0, 1);

  const examples = [...says, ...does];
  if (baseline.startingPoint.trim()) {
    examples.push(baseline.startingPoint.trim().slice(0, 48));
  }

  const unique = [...new Set(examples.map((s) => s.trim()).filter(Boolean))];
  if (unique.length >= 2) return unique.slice(0, 3);

  return [
    "고객이 말한 불편을 한 줄로 적어 볼게요",
    "실제로 반복되는 행동 패턴이 있어요",
    "그 아래 동기는 아직 가설이에요",
  ];
}
