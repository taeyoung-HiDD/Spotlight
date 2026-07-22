import type { MessageKey } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/t";
import type { UiLocale } from "@/lib/i18n/uiLocale";

/** stageConfig·패널에서 쓰는 한국어 status → message key */
const STATUS_KEY_BY_KO: Record<string, MessageKey> = {
  "듣는 중": "coach.status.listening",
  "생각하는 중": "coach.status.thinking",
  "입력하는 중": "coach.status.typing",
  "짚어주는 중": "coach.status.pointing",
  "제안 중": "coach.status.suggesting",
  "환영": "coach.status.welcoming",
  "함께 짚어보는 중": "coach.status.exploring",
  "함께 펼치는 중": "coach.status.expanding",
  "반영 중": "coach.status.thinking",
};

export function localizeCoachStatus(
  locale: UiLocale,
  label: string | undefined | null,
): string {
  const raw = (label ?? "").trim();
  if (!raw) return raw;
  if (locale !== "en") return raw;
  const key = STATUS_KEY_BY_KO[raw];
  if (key) return t("en", key);
  return raw;
}
