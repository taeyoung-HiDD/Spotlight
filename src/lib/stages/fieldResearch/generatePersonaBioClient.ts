import {
  normalizeNemotronPersonaProfile,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";
import {
  heuristicPersonaBio,
  normalizePersonaBio,
  type PersonaBio,
} from "@/lib/stages/stage4/personaBio";

export interface GeneratePersonaBioInput {
  problem: string;
  prePmfSummary?: string;
  personaName: string;
  personaContext: string;
  existingBio?: PersonaBio;
  /** 이미 매칭된 가상 사용자 프로필 (있으면 재매칭 없이 유지) */
  personaProfile?: NemotronPersonaProfile;
  /** 같은 프로젝트의 다른 페르소나가 사용 중인 프로필 uuid */
  excludeProfileIds?: string[];
}

export interface GeneratePersonaBioResult {
  bio: PersonaBio;
  profile?: NemotronPersonaProfile;
}

export async function generatePersonaBio(
  input: GeneratePersonaBioInput,
): Promise<GeneratePersonaBioResult> {
  const res = await fetch("/api/stage3/persona-bio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as {
    bio?: unknown;
    profile?: unknown;
    source?: string;
    error?: string;
  };
  const profile = normalizeNemotronPersonaProfile(data.profile);

  if (!res.ok) {
    if (data.bio) {
      return {
        bio: normalizePersonaBio(data.bio, {
          name: input.personaName,
          context: input.personaContext,
        }),
        profile,
      };
    }
    throw new Error(data.error ?? "Bio 생성에 실패했습니다.");
  }

  if (!data.bio) {
    return {
      bio: heuristicPersonaBio({
        personaName: input.personaName,
        personaContext: input.personaContext,
      }),
      profile,
    };
  }

  return {
    bio: normalizePersonaBio(data.bio, {
      name: input.personaName,
      context: input.personaContext,
    }),
    profile,
  };
}
