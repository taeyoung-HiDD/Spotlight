import { EN_MESSAGES, KO_MESSAGES, type MessageKey } from "@/lib/i18n/messages";
import type { UiLocale } from "@/lib/i18n/uiLocale";

export type { MessageKey };

export function getMessages(locale: UiLocale) {
  return locale === "en" ? EN_MESSAGES : KO_MESSAGES;
}

export function t(
  locale: UiLocale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const catalog = getMessages(locale);
  let text = catalog[key] ?? KO_MESSAGES[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function stageNavMessageKey(stageId: number): MessageKey | null {
  if (stageId < 1 || stageId > 16) return null;
  return `stage.${stageId}.nav` as MessageKey;
}

export function artifactMessageKey(stageId: number): MessageKey | null {
  if (stageId < 1 || stageId > 16) return null;
  return `artifact.${stageId}` as MessageKey;
}
