import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import {
  formatNemotronProfilePromptBlock,
  normalizeNemotronPersonaProfile,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";
import { matchNemotronPersona } from "@/lib/personas/nemotronPersonaService";
import {
  buildPersonaBioPrompt,
  heuristicPersonaBio,
  normalizePersonaBio,
  parsePersonaBioJson,
  personaBioFromNemotronProfile,
} from "@/lib/stages/stage4/personaBio";

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
  const personaName =
    typeof o.personaName === "string" ? o.personaName.trim().slice(0, 60) : "";
  const personaContext =
    typeof o.personaContext === "string"
      ? o.personaContext.trim().slice(0, 400)
      : "";
  const existingBio = normalizePersonaBio(o.existingBio, {
    name: personaName,
    context: personaContext,
  });
  const existingProfile = normalizeNemotronPersonaProfile(o.personaProfile);
  const excludeIds = Array.isArray(o.excludeProfileIds)
    ? o.excludeProfileIds
        .filter((x): x is string => typeof x === "string")
        .slice(0, 16)
    : [];

  if (!personaName && !personaContext) {
    return NextResponse.json(
      { error: "페르소나 이름 또는 맥락이 필요합니다." },
      { status: 400 },
    );
  }

  // 1) Nemotron-Personas-Korea에서 세그먼트에 가까운 가상 사용자 매칭 (기존 매칭은 유지)
  let profile: NemotronPersonaProfile | null = existingProfile ?? null;
  if (!profile) {
    profile = await matchNemotronPersona({
      segmentName: personaName,
      segmentContext: personaContext,
      problem,
      excludeIds,
    });
  }

  const fallbackBio = () =>
    profile
      ? personaBioFromNemotronProfile(profile, personaName)
      : heuristicPersonaBio({ personaName, personaContext });

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      bio: fallbackBio(),
      profile,
      source: profile ? "nemotron_heuristic" : "heuristic",
    });
  }

  try {
    const result = await groqComplete(
      buildPersonaBioPrompt({
        problem,
        prePmfSummary: prePmfSummary || undefined,
        personaName,
        personaContext,
        existingBio,
        profileBlock: profile
          ? formatNemotronProfilePromptBlock(profile)
          : undefined,
      }),
      {
        models: resolveGroqTextModels(),
        temperature: 0.4,
        jsonMode: true,
      },
    );
    const parsed = parsePersonaBioJson(result.text);
    if (!parsed) {
      return NextResponse.json({
        bio: fallbackBio(),
        profile,
        source: profile ? "nemotron_heuristic" : "heuristic_fallback",
      });
    }
    return NextResponse.json({
      bio: parsed,
      profile,
      source: profile ? "nemotron_groq" : "groq",
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Bio 생성에 실패했습니다.";
    console.error("[persona-bio]", detail);
    return NextResponse.json(
      {
        error: "Bio 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        bio: fallbackBio(),
        profile,
        source: profile ? "nemotron_heuristic" : "heuristic_fallback",
      },
      { status: 502 },
    );
  }
}
