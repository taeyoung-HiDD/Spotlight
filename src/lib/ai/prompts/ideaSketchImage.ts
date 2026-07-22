import { appendImageNoTextConstraint } from "@/lib/ai/prompts/imageNoTextConstraint";

const STYLE_TOKENS = `
- Pure white background (#FFFFFF), pencil/pen hand-drawn sketch
- Charcoal lines (#2D2D2A), small yellow accents (#F4C430) on key objects only
- Low-fidelity wireframe, not a polished UI mockup
`.trim();

/** 이미지에 박혀 나오는 플레이스홀더 라벨 금지 (모델이 자주 그리는 패턴) */
const FORBIDDEN_LABEL_PATTERNS = `
- "IDEA TITLE", "IDEA DESCRIPTION", "HMW", "TITLE", "DESCRIPTION"
- Form headers, caption bars, annotation boxes, speech bubbles with words
- Chart axis labels, menu text, button text, placeholder rectangles meant for copy
- Korean or English words of any kind inside the picture
`.trim();

export interface IdeaSketchImageInput {
  hmwText?: string;
  title: string;
  description?: string;
}

export function buildIdeaSketchImagePrompt(input: IdeaSketchImageInput): string {
  const title = input.title.trim().slice(0, 120);
  const description = input.description?.trim().slice(0, 600) ?? "";
  const hmw = input.hmwText?.trim().slice(0, 400) ?? "";

  const contextLines = [
    title ? `Concept title: ${title}` : "",
    hmw ? `HMW question: ${hmw}` : "",
    description ? `Idea description: ${description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const body = `
Create ONE hand-drawn concept sketch for a design-thinking idea.

=== REFERENCE CONTEXT (read only — NEVER render these strings or related field labels in the image) ===
${contextLines || "Infer the core interaction from the concept."}

The title, HMW question, and description above are metadata for YOU only.
They must NOT appear as text, headers, form fields, or labeled empty slots in the drawing.

=== DRAW ONLY ===
- One visual scene of the core product interaction or user experience implied by the context
- Icons, maps, people, devices, simple charts as wordless shapes (no axis names, no legends)
- Light hatching and arrows allowed; focus on what happens, not what it is called

Style:
${STYLE_TOKENS}

Forbidden inside the image:
${FORBIDDEN_LABEL_PATTERNS}
- Empty UI slots or wireframe boxes reserved for titles/descriptions/HMW copy
- Black letterboxing, gray margins, vignettes, watermarks, logos
- Photos, 3D renders, high-fidelity app screenshots

Output: a text-free visual sketch on a full-bleed white canvas.
`.trim();

  return appendImageNoTextConstraint(body);
}
