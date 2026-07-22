/**
 * NVIDIA Nemotron-Personas-Korea 데이터셋 기반 가상 사용자 프로필.
 * https://huggingface.co/datasets/nvidia/Nemotron-Personas-Korea
 *
 * 한국 인구 통계(연령·직업·지역·가족 구성 등)에 맞춰 합성된 100만 명의
 * 페르소나 중 타겟 세그먼트와 가장 가까운 인물을 매칭해, 페르소나가
 * 실제 인물처럼 생각하고 답변할 수 있는 배경을 제공한다.
 */

export interface NemotronPersonaProfile {
  /** 데이터셋 row uuid */
  sourceId: string;
  /** 핵심 페르소나 한 줄 */
  persona: string;
  professionalPersona: string;
  familyPersona: string;
  culturalBackground: string;
  skillsAndExpertise: string;
  hobbiesAndInterests: string;
  careerGoalsAndAmbitions: string;
  sex: string;
  age: string;
  maritalStatus: string;
  educationLevel: string;
  occupation: string;
  district: string;
  province: string;
  /** 매칭 시각 (ISO) */
  matchedAt: string;
}

function clipField(value: unknown, max: number): string {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeNemotronPersonaProfile(
  raw: unknown,
): NemotronPersonaProfile | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const sourceId = clipField(o.sourceId, 64);
  const persona = clipField(o.persona, 400);
  if (!sourceId && !persona) return undefined;
  return {
    sourceId,
    persona,
    professionalPersona: clipField(o.professionalPersona, 600),
    familyPersona: clipField(o.familyPersona, 600),
    culturalBackground: clipField(o.culturalBackground, 600),
    skillsAndExpertise: clipField(o.skillsAndExpertise, 500),
    hobbiesAndInterests: clipField(o.hobbiesAndInterests, 500),
    careerGoalsAndAmbitions: clipField(o.careerGoalsAndAmbitions, 500),
    sex: clipField(o.sex, 10),
    age: clipField(o.age, 10),
    maritalStatus: clipField(o.maritalStatus, 20),
    educationLevel: clipField(o.educationLevel, 40),
    occupation: clipField(o.occupation, 60),
    district: clipField(o.district, 40),
    province: clipField(o.province, 30),
    matchedAt: clipField(o.matchedAt, 40),
  };
}

export function nemotronProfileHasContent(
  profile: NemotronPersonaProfile | undefined,
): profile is NemotronPersonaProfile {
  return Boolean(profile && (profile.persona || profile.professionalPersona));
}

/** 프로필에서 인물 이름 추출 (persona 텍스트의 「홍길동 씨는…」 패턴) */
export function nemotronProfileName(profile: NemotronPersonaProfile): string {
  const sources = [
    profile.persona,
    profile.professionalPersona,
    profile.familyPersona,
  ];
  for (const text of sources) {
    const m = text.match(/^([가-힣]{2,4})\s*(?:씨|님)?(?:는|은|이|가)\s/u);
    if (m?.[1]) return m[1];
  }
  return "";
}

/** 인구 통계 요약 한 줄 (예: 여성 · 34세 · 기혼 · 서울 강남구 · 마케터) */
export function nemotronProfileDemographics(
  profile: NemotronPersonaProfile,
): string {
  const region = [profile.province, profile.district]
    .filter(Boolean)
    .join(" ");
  return [
    profile.sex,
    profile.age ? `${profile.age}세` : "",
    profile.maritalStatus,
    region,
    profile.occupation,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** AI 프롬프트에 넣는 가상 사용자 프로필 블록 */
export function formatNemotronProfilePromptBlock(
  profile: NemotronPersonaProfile,
): string {
  const lines: string[] = [];
  const demo = nemotronProfileDemographics(profile);
  if (demo) lines.push(`- 인구 통계: ${demo}`);
  if (profile.educationLevel) lines.push(`- 학력: ${profile.educationLevel}`);
  if (profile.persona) lines.push(`- 성격·특징: ${profile.persona}`);
  if (profile.professionalPersona)
    lines.push(`- 직업 생활: ${profile.professionalPersona}`);
  if (profile.familyPersona) lines.push(`- 가족·일상: ${profile.familyPersona}`);
  if (profile.culturalBackground)
    lines.push(`- 문화적 배경: ${profile.culturalBackground}`);
  if (profile.skillsAndExpertise)
    lines.push(`- 역량: ${profile.skillsAndExpertise}`);
  if (profile.hobbiesAndInterests)
    lines.push(`- 취미·관심사: ${profile.hobbiesAndInterests}`);
  if (profile.careerGoalsAndAmbitions)
    lines.push(`- 목표·야망: ${profile.careerGoalsAndAmbitions}`);
  return lines.join("\n");
}
