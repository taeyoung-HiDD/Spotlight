import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import type { IcebergModelData, IcebergPrepState } from "@/lib/stages/iceberg/types";
import {
  extractSaysFromEmpathyMaps,
  type Stage5BaselineContext,
} from "@/lib/stages/iceberg/stage5ProjectContext";

export type { Stage5BaselineContext } from "@/lib/stages/iceberg/stage5ProjectContext";
export { EMPTY_STAGE5_BASELINE } from "@/lib/stages/iceberg/stage5ProjectContext";

export interface AdvanceIcebergDiscoveryResult {
  prep: IcebergPrepState;
  coachReply: string;
  draftData?: Partial<IcebergModelData>;
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function linesFromText(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[·•\-\d.)\s]+/, "").trim())
    .filter(Boolean);
}

export function isIcebergDiscoveryActive(prep: IcebergPrepState): boolean {
  return prep.phase === "discovery" && prep.step !== "done";
}

export function getIcebergPurposeExplanation(
  baseline: Stage5BaselineContext,
): string {
  const problem = baseline.startingPoint.trim();
  const lead = problem
    ? `1단계 문제 「${clip(problem, 72)}」을(를) 더 깊게 보려면`
    : "고객 니즈를 더 깊게 보려면";

  return formatCoachDialogBreaks(
    `${lead}, 말한 것·행동·잠재 동기를 세 층으로 나눠 보는 단계예요.

표면에 드러난 말, 실제 행동, 그 아래 동기는 다를 수 있어요. 지금은 가설로 적어 두고, 나중에 사용자 조사로 검증해요.`,
  );
}

export function buildIcebergDiscoveryKickoff(
  baseline: Stage5BaselineContext,
): string[] {
  const lines: string[] = [
    "짧게 대화해 주시면, 그걸 바탕으로 왼쪽 세 층 초안을 만들어 드릴게요.",
  ];

  const saysQuotes = extractSaysFromEmpathyMaps(baseline.empathyMaps);
  const firstSays = saysQuotes[0];

  if (firstSays) {
    lines.push(
      `4단계 공감맵에 ${firstSays.personaLabel}님 말함이 있어요. 1층 말한 것에 더 넣을 표현이 있나요? 없으면 공감맵 내용을 그대로 쓰셔도 돼요.`,
    );
  } else if (baseline.personaName.trim()) {
    lines.push(
      `4단계 페르소나 ${baseline.personaName.trim()}님 기준으로, 말로 표현한 니즈·불편은 무엇인가요? (여러 줄도 괜찮아요)`,
    );
  } else if (baseline.startingPoint.trim()) {
    lines.push(
      `1단계 문제를 바탕으로, 고객이 말로 표현한 니즈·불편은 무엇인가요? 한 줄에 하나씩 적어 주셔도 돼요.`,
    );
  } else {
    lines.push(
      "고객이 말로 표현한 니즈·불편은 무엇인가요? 한 줄에 하나씩 떠오르는 대로 적어 주셔도 돼요.",
    );
  }
  return lines.map((l) => formatCoachDialogBreaks(l));
}

function buildDraftFromPrep(prep: IcebergPrepState): Partial<IcebergModelData> {
  const explicitItems = linesFromText(prep.explicitNotes);
  const tacitItems = linesFromText(prep.tacitNotes);
  const latentLines = linesFromText(prep.latentNotes);
  const headline = latentLines[0] ?? prep.latentNotes.trim().slice(0, 48);
  const quote =
    latentLines.find((l) => l.length < 80) ?? latentLines[1] ?? headline;

  return {
    explicit: { items: explicitItems.length ? explicitItems : [prep.explicitNotes.trim()].filter(Boolean) },
    tacit: {
      items: tacitItems.length ? tacitItems : [prep.tacitNotes.trim()].filter(Boolean),
    },
    tacitAutoNote: "코치 대화에서 정리한 행동·관찰 메모",
    latent: {
      headline: headline || "더 깊은 동기 (가설)",
      quote: quote ? `「${quote}」` : "",
      evidence: prep.latentNotes.trim(),
    },
  };
}

const USAGE_GUIDE = formatCoachDialogBreaks(`왼쪽 세 층에 초안을 넣어 두었어요. (가설)

이렇게 쓰면 돼요
· 1층 말한 것 — 고객이 말로 표현한 니즈
· 2층 행동 — 관찰·행동에서 본 패턴
· 3층 잠재 — 우리가 추론한 동기 (검증 전)

각 층을 다듬고, 더 깊게 파고 싶으면 아래 입력창으로 물어보세요.`);

export function advanceIcebergDiscovery(
  message: string,
  prep: IcebergPrepState,
  baseline: Stage5BaselineContext,
): AdvanceIcebergDiscoveryResult {
  const text = message.trim();
  if (!text) {
    return {
      prep,
      coachReply: "한 줄이라도 적어 주시면 다음으로 넘어갈게요.",
    };
  }

  switch (prep.step) {
    case "explicit": {
      const next: IcebergPrepState = {
        ...prep,
        explicitNotes: text,
        step: "tacit",
      };
      const hint = baseline.personaName.trim()
        ? `${baseline.personaName.trim()}님을 관찰했을 때`
        : "그 고객을 관찰했을 때";
      return {
        prep: next,
        coachReply: formatCoachDialogBreaks(
          `${hint}, 행동·습관·반복되는 패턴에서 본 것은 무엇인가요? (말과 다를 수 있어요)`,
        ),
      };
    }
    case "tacit": {
      const next: IcebergPrepState = {
        ...prep,
        tacitNotes: text,
        step: "latent",
      };
      return {
        prep: next,
        coachReply: formatCoachDialogBreaks(
          "한 단계 더 내려가 볼게요. 그 행동 뒤에 있을 것 같은 동기·욕구·불안은 무엇인가요? (가설로 적어 주세요)",
        ),
      };
    }
    case "latent": {
      const finalPrep: IcebergPrepState = {
        ...prep,
        latentNotes: text,
        step: "done",
        phase: "refining",
      };
      return {
        prep: finalPrep,
        coachReply: USAGE_GUIDE,
        draftData: buildDraftFromPrep(finalPrep),
      };
    }
    default:
      return {
        prep,
        coachReply: "왼쪽 세 층을 다듬어 보세요. 궁금한 점은 여기로 물어보시면 돼요.",
      };
  }
}

export function resolveIcebergPrepFromLoad(
  raw: unknown,
  data: Pick<IcebergModelData, "explicit" | "tacit" | "latent">,
): IcebergPrepState {
  const fallback: IcebergPrepState = {
    phase: "discovery",
    step: "explicit",
    explicitNotes: "",
    tacitNotes: "",
    latentNotes: "",
  };

  const hasContent =
    data.explicit.items.some((s) => s.trim()) ||
    data.tacit.items.some((s) => s.trim()) ||
    data.latent.headline.trim() ||
    data.latent.quote.trim() ||
    data.latent.evidence.trim();

  if (hasContent) {
    return { ...fallback, phase: "refining", step: "done" };
  }

  if (!raw || typeof raw !== "object") return fallback;

  const p = raw as Record<string, unknown>;
  const step = p.step as IcebergPrepState["step"] | undefined;
  const phase = p.phase as IcebergPrepState["phase"] | undefined;

  return {
    phase: phase === "discovery" || phase === "refining" ? phase : "discovery",
    step:
      step === "explicit" ||
      step === "tacit" ||
      step === "latent" ||
      step === "done"
        ? step
        : "explicit",
    explicitNotes: typeof p.explicitNotes === "string" ? p.explicitNotes : "",
    tacitNotes: typeof p.tacitNotes === "string" ? p.tacitNotes : "",
    latentNotes: typeof p.latentNotes === "string" ? p.latentNotes : "",
  };
}
