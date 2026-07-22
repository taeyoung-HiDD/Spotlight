import {
  nemotronProfileName,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";

export interface PersonaBio {
  name: string;
  age: string;
  occupation: string;
  familyRelations: string;
}

export function emptyPersonaBio(): PersonaBio {
  return {
    name: "",
    age: "",
    occupation: "",
    familyRelations: "",
  };
}

function clipField(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizePersonaBio(
  raw: unknown,
  fallback?: { name?: string; context?: string },
): PersonaBio {
  const o = raw && typeof raw === "object" ? (raw as Partial<PersonaBio>) : {};
  const name =
    clipField(o.name, 40) ||
    clipField(fallback?.name, 40) ||
    "";
  const age = clipField(o.age, 24);
  const occupation = clipField(o.occupation, 80);
  const familyRelations = clipField(o.familyRelations, 120);

  if (name || age || occupation || familyRelations) {
    return { name, age, occupation, familyRelations };
  }

  const ctx = fallback?.context?.trim() ?? "";
  return {
    name,
    age: "",
    occupation: ctx.slice(0, 80),
    familyRelations: "",
  };
}

/** Bio 필드를 한 줄 요약(공감맵 부제)으로 */
export function formatPersonaBioSummary(bio: PersonaBio): string {
  const parts = [bio.age, bio.occupation, bio.familyRelations]
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(" · ").slice(0, 120);
}

export function personaBioHasContent(bio: PersonaBio): boolean {
  return Boolean(
    bio.name.trim() ||
      bio.age.trim() ||
      bio.occupation.trim() ||
      bio.familyRelations.trim(),
  );
}

export function buildPersonaBioPrompt(input: {
  problem: string;
  prePmfSummary?: string;
  personaName: string;
  personaContext: string;
  existingBio?: PersonaBio;
  /** Nemotron 가상 사용자 프로필 블록 (있으면 이 인물 기준으로 작성) */
  profileBlock?: string;
}): string {
  const problem = input.problem.trim().slice(0, 1200);
  const summary = input.prePmfSummary?.trim().slice(0, 2000) ?? "";
  const name = input.personaName.trim() || "타겟 유저";
  const ctx = input.personaContext.trim();
  const existing = input.existingBio;
  const profileBlock = input.profileBlock?.trim() ?? "";

  return `
당신은 사용자 조사용 페르소나 Bio를 작성하는 창업 코치 보조입니다.
1·2단계 문제 정의와 사전 조사를 바탕으로 **가설** 페르소나 기본 정보를 한국어로 채웁니다.

규칙:
- 실제 인물이 아닌 조사용 가상 페르소나입니다. 단정하지 말고 그럴듯한 가설만 씁니다.
- name: 이름 또는 호칭 (예: 민지, 30대 직장인 김OO)
- age: 나이·연령대 (예: 34세, 20대 후반)
- occupation: 직업·역할 (예: 스타트업 마케팅 매니저)
- familyRelations: 가족·관계 맥락 (예: 아내와 초등학생 자녀 1명)
- 존댓말·구어체(~해요) 설명문이 아니라 **짧은 명사구**만 각 필드에 넣습니다.
${profileBlock ? "- 아래 「가상 사용자 프로필」은 한국 인구 통계 기반으로 합성된 실제에 가까운 인물입니다. **이 인물의 이름·나이·직업·가족 구성을 그대로 반영**해 Bio를 채웁니다." : ""}
- JSON만 출력합니다.

문제 정의:
${problem || "(없음)"}
${summary ? `\n사전 조사 요약:\n${summary}` : ""}

타겟 힌트: ${name}${ctx ? ` — ${ctx.slice(0, 200)}` : ""}
${profileBlock ? `\n가상 사용자 프로필 (이 인물 기준으로 작성):\n${profileBlock}` : ""}
${existing && personaBioHasContent(existing) ? `\n기존 Bio(참고): ${JSON.stringify(existing)}` : ""}

출력 형식:
{"bio":{"name":"...","age":"...","occupation":"...","familyRelations":"..."}}
`.trim();
}

export function parsePersonaBioJson(text: string): PersonaBio | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { bio?: unknown };
    if (!parsed.bio) return null;
    const bio = normalizePersonaBio(parsed.bio);
    return personaBioHasContent(bio) ? bio : null;
  } catch {
    return null;
  }
}

export function heuristicPersonaBio(input: {
  personaName: string;
  personaContext: string;
}): PersonaBio {
  const name = input.personaName.trim() || "타겟 유저";
  const ctx = input.personaContext.trim();
  return normalizePersonaBio(
    {
      name,
      age: "30대",
      occupation: ctx.slice(0, 60) || "직장인",
      familyRelations: "가족 구성 미정",
    },
    { name, context: ctx },
  );
}

/** Nemotron 가상 사용자 프로필 → Bio (AI 없이도 실제형 인물 정보 반영) */
export function personaBioFromNemotronProfile(
  profile: NemotronPersonaProfile,
  fallbackName: string,
): PersonaBio {
  const name = nemotronProfileName(profile) || fallbackName.trim() || "타겟 유저";
  const family = [
    profile.maritalStatus,
    profile.familyPersona.split(/[.。]/u)[0]?.trim() ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
  return normalizePersonaBio(
    {
      name,
      age: profile.age ? `${profile.age}세` : "",
      occupation: profile.occupation,
      familyRelations: family,
    },
    { name },
  );
}
