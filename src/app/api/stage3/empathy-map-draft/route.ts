import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import {
  normalizeNemotronPersonaProfile,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";
import { matchNemotronPersona } from "@/lib/personas/nemotronPersonaService";
import {
  buildStage3EmpathyDraftPrompt,
  heuristicStage3EmpathyDraft,
  normalizeStage3EmpathyDraftMaps,
  parseStage3EmpathyDraftJson,
  type Stage3EmpathyDraftInput,
  type Stage3EmpathyDraftPersona,
} from "@/lib/stages/fieldResearch/generateStage3EmpathyDraft";
import { normalizePersonaBio } from "@/lib/stages/stage4/personaBio";

function parsePersonas(raw: unknown): Stage3EmpathyDraftPersona[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const o = item as Record<string, unknown>;
      const personaName = String(o.personaName ?? "").trim().slice(0, 60);
      const personaContext = String(o.personaContext ?? "").trim().slice(0, 400);
      return {
        personaName,
        personaContext,
        personaBio: normalizePersonaBio(o.personaBio, {
          name: personaName,
          context: personaContext,
        }),
        personaProfile: normalizeNemotronPersonaProfile(o.personaProfile),
      };
    })
    .filter((p) => p.personaName || p.personaContext)
    .slice(0, 8);
}

/** 프로필이 없는 페르소나에 Nemotron 가상 사용자 매칭 (서로 다른 인물 배정) */
async function fillPersonaProfiles(
  personas: Stage3EmpathyDraftPersona[],
  problem: string,
): Promise<Array<NemotronPersonaProfile | null>> {
  const used = personas
    .map((p) => p.personaProfile?.sourceId)
    .filter((id): id is string => Boolean(id));

  const profiles: Array<NemotronPersonaProfile | null> = [];
  for (const persona of personas) {
    if (persona.personaProfile) {
      profiles.push(persona.personaProfile);
      continue;
    }
    const matched = await matchNemotronPersona({
      segmentName: persona.personaName,
      segmentContext: persona.personaContext,
      problem,
      excludeIds: used,
    });
    if (matched) {
      used.push(matched.sourceId);
      persona.personaProfile = matched;
    }
    profiles.push(matched);
  }
  return profiles;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const problem =
    typeof o.problem === "string" ? o.problem.trim().slice(0, 2000) : "";
  const prePmfSummary =
    typeof o.prePmfSummary === "string"
      ? o.prePmfSummary.trim().slice(0, 4000)
      : "";
  const personas = parsePersonas(o.personas);

  if (!personas.length) {
    return NextResponse.json(
      { error: "타겟 유저 정보가 필요합니다." },
      { status: 400 },
    );
  }

  const profiles = await fillPersonaProfiles(personas, problem);

  const input: Stage3EmpathyDraftInput = {
    problem,
    prePmfSummary: prePmfSummary || undefined,
    personas,
  };

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      maps: heuristicStage3EmpathyDraft(input),
      profiles,
      source: "heuristic",
    });
  }

  try {
    const result = await groqComplete(buildStage3EmpathyDraftPrompt(input), {
      models: resolveGroqTextModels(),
      temperature: 0.45,
      jsonMode: true,
    });

    const parsed = parseStage3EmpathyDraftJson(result.text, personas);
    if (!parsed) {
      return NextResponse.json({
        maps: heuristicStage3EmpathyDraft(input),
        profiles,
        source: "heuristic_fallback",
      });
    }

    return NextResponse.json({
      maps: normalizeStage3EmpathyDraftMaps(parsed, input),
      profiles,
      source: "groq",
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "공감맵 생성에 실패했습니다.";
    console.error("[empathy-map-draft]", detail);
    return NextResponse.json(
      {
        error: "공감맵 초안 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        maps: heuristicStage3EmpathyDraft(input),
        profiles,
        source: "heuristic_fallback",
      },
      { status: 502 },
    );
  }
}
